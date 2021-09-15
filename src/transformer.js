/*

仅实现最基本功能 demo
1. 只支持 FunctionDeclare | FunctionDeclare 
2. 分支支持 if / else
3. 循环只支持 for(;;;) / while
3. 自动改无冲突变量名

没实现的
1. 不支持其他各种函数表达式，不支持函数里面嵌套定义
2. 不支持 ? : / && / || 等对运算顺序有影响的表达式

Pass
1. 全图变量收集 / 标记 / 链接 / 引用的 scope，将信息附带到 AST 上，用于全图改名
2. 表达式分析，将 await 部分从表达式拆出来，自动添加 _temp 变量（全图无冲突）
3. 控制流分析
  1. if / else if / else 全部转换成 if / else 形式
  2. 所有循环都转换成 while 循环
  3. 最后将所有代码准换成 label / goto 形式
4. 将 label / goto 形式转换成 switch case 形式

Runtime
1. runner

编译的语言支持范围 ES5 + async / await （
*/

const acorn = require('acorn');
const astring = require('astring');
const prettier = require('prettier');
const { traverse } = require('./traverse');
const { pattern, match, guard, capture } = require('./pattern');

const { SupportedChecker, defaultSupported } = require('./checker');
const checker = new SupportedChecker(defaultSupported);

// 转换器入口
const transform = source => {
  // 解析代码
  const sourceNode = acorn.parse(source, { ecmaVersion: 'latest' });

  // 语法检查，检查 input 代码是否符合 demo 能接受的语法，不符合报错
  checker.check(sourceNode, source);

  // 转换器入口
  const replacer = traverse((node, next) => guard(node, [
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

        // 构建基本框架
        return {
          type: 'VariableDeclaration',
          kind: 'var',
          declarations: [{
            id: {
              type: 'Identifier',
              name,
            },
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
                    // 转换后的函数体
                    {
                      type: 'ReturnStatement',
                      argument: {
                        type: 'FunctionExpression',
                        params: [{
                          type: 'Identifier',
                          name: '__context', // context 参数
                        }],
                        body,
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
    [pattern.unit, () => next(node)],
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
          if (result.then) {
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
