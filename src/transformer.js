/*

仅实现最基本功能 demo
1. 只支持 FunctionDeclaration
2. 分支支持 if / else
3. 循环只支持 while

没实现的
1. 不支持其他各种函数表达式，不支持函数里面嵌套定义
2. 不支持 ? : / && / || 等对运算顺序有影响的表达式

Pass
2. 表达式分析，将 await 部分从表达式拆出来，自动添加 _temp 变量
3. 控制流分析
4. 将 label / goto 形式转换成 switch case 形式

Runtime
1. runner

编译的语言支持范围 ES5 + async / await
*/

const acorn = require('acorn');
const astring = require('astring');
const prettier = require('prettier');
const { traverse } = require('./traverse');
const { pattern, guard, capture } = require('./pattern');
const { Return, Label, IfElse, Identifier, Assignment, Member } = require('./ast-gen');

const { SupportedChecker, defaultSupported } = require('./checker');
const checker = new SupportedChecker(defaultSupported);

// 转换器入口
const transform = source => {
  // 解析代码
  const sourceNode = acorn.parse(source, { ecmaVersion: 'latest' });

  // 语法检查，检查 input 代码是否符合 demo 能接受的语法，不符合报错
  checker.check(sourceNode, source);

  // 转换器入口
  const replacer = traverse((replacerNode, replacerNext) => guard(replacerNode, [
    [
      // 匹配 async 函数
      {
        type: 'FunctionDeclaration',
        async: true,
        params: capture('params'),
        body: capture('body'),
        id: {
          type: 'Identifier',
          name: capture('name'),
        },
      },
      ({ params, body, name }) => {

        // 结果
        let linerStatements = [];
        const variables = new Set();

        // label
        const getLabelNu = (() => {
          let labelNu = 0;
          return () => ++labelNu
        })();

        // 块分析器
        const blockReplacer = blockNode => {
          const { body } = blockNode;
          for (const node of body) {
            statReplacer(node);
          }
        }

        // 命令分析器
        const statReplacer = statNode => {
          guard(statNode, [
            [{ type: 'ExpressionStatement', expression: capture('expression') }, ({ expression }) => {
              statNode.expression = exprReplacer(expression);
              linerStatements.push(statNode);
            }],
            [{ type: 'BlockStatement' }, () => blockReplacer(statNode)],
            [{ type: 'ReturnStatement', argument: capture('argument') }, ({ argument }) => {
              linerStatements.push(Return(-1, argument));
            }],
            [
              { type: 'IfStatement', test: capture('test'), consequent: capture('consequent'), alternate: capture('alternate') },
              ({ test, consequent, alternate }) => {
                const exprNode = exprReplacer(test);

                const endReturn = Return();
                const ifStat = IfElse(exprNode, Return(), alternate ? Return() : endReturn);

                linerStatements.push(ifStat);

                const consequentNu = getLabelNu();
                ifStat.consequent.argument.elements[0].value = consequentNu;
                linerStatements.push(Label(consequentNu));
                statReplacer(consequent);

                if (alternate) {
                  linerStatements.push(endReturn);
                  const alternateNu = getLabelNu()
                  ifStat.alternate.argument.elements[0].value = alternateNu;
                  linerStatements.push(Label(alternateNu));
                  statReplacer(alternate);
                }

                const endNu = getLabelNu();
                endReturn.argument.elements[0].value = endNu;
                linerStatements.push(Label(endNu));
              }
            ],

            [{ type: 'WhileStatement', test: capture('test'), body: capture('body') }, ({ test, body }) => {
              const topLabel = Label(getLabelNu());
              const bodyLabel = Label();
              const endLabel = Label();

              const ifStat = IfElse(null, Return(), Return());

              linerStatements.push(topLabel);
              const exprNode = exprReplacer(test);
              ifStat.test = exprNode;
              linerStatements.push(ifStat);

              bodyLabel.nu = getLabelNu()
              linerStatements.push(bodyLabel);
              ifStat.consequent.argument.elements[0].value = bodyLabel.nu;
              statReplacer(body);

              linerStatements.push(Return(topLabel.nu));

              endLabel.nu = getLabelNu();
              linerStatements.push(endLabel);
              ifStat.alternate.argument.elements[0].value = endLabel.nu;
            }],

            [{ type: 'FunctionDeclaration', id: { name: capture('name') } }, ({ name }) => {
              variables.add(name);
              const newStat = replacer(statNode);
              linerStatements.push(guard(newStat, [
                [
                  { type: 'VariableDeclaration', declarations: pattern.tuple([{ init: capture('init') }]) },
                  ({ init }) => Assignment(name, init)
                ],
                [pattern.unit, () => newStat]
              ]));
            }],

            [
              { type: 'VariableDeclaration', declarations: capture('declarations') },
              ({ declarations }) => {
                for (const declarator of declarations) {
                  variables.add(declarator.id.name);
                  if (declarator.init) {
                    const exprNode = exprReplacer(declarator.init);
                    linerStatements.push(Assignment(declarator.id.name, exprNode));
                  }
                }
              }
            ],
            [pattern.unit, () => { linerStatements.push(statNode) }]
          ]);
        }

        // 表达式分析器
        const exprReplacer = exprNode => {
          const getTempName = (() => {
            let nu = 0;
            return () => {
              const name = `__temp${nu++}`;
              variables.add(name);
              return name;
            };
          })();

          const nextExprNode = traverse((exprSubNode, exprNext) => guard(exprSubNode, [
            // FunctionExpression 直接用
            [{ type: 'FunctionExpression' }, () => replacerNext(exprSubNode)],
            [{ type: 'AwaitExpression', argument: capture('argument') }, ({ argument }) => {
              exprNext(argument);
              const tempName = getTempName();
              const labelNu = getLabelNu();
              linerStatements = linerStatements.concat([
                Return(labelNu, argument),
                Label(labelNu),
                Assignment(tempName, Member("__context", "sent")),
              ]);

              return Identifier(tempName);
            }],
            [pattern.unit, () => exprNext(exprSubNode)],
          ]))(exprNode);

          return nextExprNode;
        }

        blockReplacer(body);

        // 将线性的代码组装成
        const cases = linerStatements.reduce((cases, stat) => {
          if (stat.type === 'Label') {
            cases.push({
              type: 'SwitchCase',
              test: {
                type: 'Literal',
                value: stat.nu,
              },
              consequent: [],
            });
          } else {
            const last = cases[cases.length - 1];
            last.consequent.push(stat);
          }
          return cases;
        }, [{
          type: 'SwitchCase',
          test: {
            type: 'Literal',
            value: 0,
          },
          consequent: [],
        }]);

        const generatorBody = {
          type: "SwitchStatement",
          discriminant: Member('__context', 'next'),
          cases,
        }

        // 构建基本框架
        return {
          type: 'VariableDeclaration',
          kind: 'var',
          declarations: [{
            id: Identifier(name),
            init: {
              type: 'CallExpression',
              callee: {
                type: 'Identifier',
                name: '__async', // 增加的 runtime 函数
              },
              arguments: [{
                type: 'FunctionExpression',
                params,
                body: {
                  type: 'BlockStatement',
                  body: [
                    // 提出来的变量
                    variables.size > 0 ? {
                      type: 'VariableDeclaration',
                      kind: 'var',
                      declarations: Array.from(variables).map(name => ({
                        type: 'VariableDeclarator',
                        id: {
                          type: 'Identifier',
                          name
                        },
                      })),
                    } : { type: 'EmptyStatement' },
                    // 转换后的函数体
                    {
                      type: 'ReturnStatement',
                      argument: {
                        type: 'FunctionExpression',
                        params: [
                          Identifier('__context'),
                        ],
                        body: {
                          type: 'BlockStatement',
                          body: [
                            generatorBody,
                            Return(-1),
                          ],
                        },
                      },
                    },
                  ],
                },
              }],
            },
          }],
        };
      },
    ],
    [pattern.unit, () => replacerNext(replacerNode)],
  ]));

  const targetNode = replacer(sourceNode);

  // 生成代码
  const target = prettier.format(astring.generate(targetNode), {
    parser: 'babel',
  });

  // 注入 runtime 函数
  const runtimeCode = `
function __async(creator) {
  return function () {
    var generator = creator.apply(null, arguments);
    var context = {
      next: 0,
      sent: null,
    };
    return new Promise(function (resolve) {
      function step() {
        const [next, result] = generator(context);
        if (next === -1) {
          return resolve(result);
        } else {
          context.next = next
          if (result && result.then) {
            result.then(d => {
              context.sent = d;
              step();
            });
          } else {
            context.sent = result;
            step();
          }
        }
      }
      step();
    });
  }
}
  `;

  return [runtimeCode, target].join('\n');
};

module.exports = { transform };
