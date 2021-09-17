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
const {
  ReturnStatement,
  ArrayExpression,
  Literal,
  FunctionExpression,
  EmptyStatement,
  VariableDeclaration,
  CallExpression,
  SwitchStatement,
  MemberExpression,
  SwitchCase,
  AssignmentStatement,
  IfStatement,
  Identifier,
} = require('./ast-gen');


const { SupportedChecker, defaultSupported } = require('./checker');
const checker = new SupportedChecker(defaultSupported);

function Label(nu) {
  return {
    type: 'Label',
    nu: nu,
  };
}

function Return(nu, data) {
  const elements = [Literal(nu)];
  if (data) {
    elements.push(data);
  }
  return ReturnStatement(ArrayExpression(elements));
}

const exprTrans = (expr, ctx) => {
  ctx.tempNu = 0;
  return traverse((node, ctx, next) => {
    // 遇到函数表达式
    if (node.type === 'FunctionExpression') {
      return asyncTrans(node);
    // 遇到 await 语句
    } else if (node.type === 'AwaitExpression') {
      next(node, ctx);

      const tempId = Identifier(ctx.getTempName());
      const wait = ctx.write(Return(null, node.argument));
      ctx.writeLabel([wait]);
      ctx.write(AssignmentStatement(
        tempId,
        MemberExpression(Identifier('__context'), Identifier('sent')),
      ));
      
      return tempId;
    }
    return next(node, ctx);
  })(expr, ctx);
}

const statTrans = (stat, ctx) => {
  const trans = ({
    // 遇到 blockStatement 递归处理
    BlockStatement: ({ body }) => {
      for (const state of body) {
        statTrans(state, ctx);
      }
    },

    // 函数定义
    FunctionExpression: ({ id }) => {
      ctx.declare(id);
      // 递归要康一眼里面有没有 async 函数的定义
      const newStat = asyncTrans(stat);
      if (newStat.type === 'VariableDeclaration') {
        for (const { id, init } of declarations) {
          ctx.declare(id, init);
          if (init) {
            ctx.write(AssignmentStatement(id, init));
          }
        }
      } else {
        ctx.write(newStat);
      }
    },

    // 变量定义
    VariableDeclaration: ({ declarations }) => {
      for (const { id, init } of declarations) {
        ctx.declare(id);
        if (init) {
          ctx.write(AssignmentStatement(id, exprTrans(init, ctx)));
        }
      }
    },

    // 遇到表达式，用表达式处理器
    ExpressionStatement: ({ expression }) => {
      const newExpression = exprTrans(expression, ctx);
      stat.expression = newExpression;
      ctx.write(stat);
    },

    // 遇到 if else 语句
    IfStatement: ({ test, consequent, alternate }) => {
      const branch = IfStatement(exprTrans(test, ctx), Return(), Return());
      ctx.write(branch);
      ctx.writeLabel([brach.consequent]);
      statTrans(consequent, ctx);

      if (alternate) {
        const end = ctx.write(Return());
        ctx.writeLabel([branch.alternate]);
        statTrans(alternate, ctx);
        ctx.writeLabel([end]);
      } else {
        ctx.writeLabel([branch.alternate]);
      }
    },

    // 遇到 while 语句
    WhileStatement: ({ test, body }) => {
      const top = ctx.writeLabel();
      const ifStat = ctx.write(
        IfStatement(exprTrans(test, ctx), Return(), Return())
      );

      ctx.writeLabel([ifStat.consequent]);
      statTrans(body, ctx);
      ctx.write(Return(top.nu));

      ctx.writeLabel([ifStat.alternate]);
    },

    // 遇到 return 语句数据结束语句
    ReturnStatement: ({ argument }) => ctx.write(Return(-1, argument)),

    // @TODO: 其他的语句也可以自己按照规则实现
  })[stat.type];

  return (trans || (() => ctx.write(stat)))(stat);
}

// 找到 Async 并做处理
const asyncTrans = traverse((node, _, next) => {
  // 判断是 async 函数则开始做转换
  if (node.type === 'FunctionDeclaration' && node.async) {
    const { id: { name }, params, body } = node;

    // 准备代码生成的上下文
    const ctx = {
      tempNu: 0,
      labelNu: 0,
      statements: [Label(0)],
      variables: new Set(),

      write(statement) {
        this.statements.push(statement);
        return statement;
      },

      declare({ name }) {
        this.variables.add(name);
      },

      writeLabel(writeBacks = []) {
        const last = this.statements[this.statements.length - 1];
        const label = last.type === 'Label' ? last : Label(++this.labelNu);
        // 回填
        for (const item of writeBacks) {
          item.argument.elements[0].value = label.nu;
        }
        return this.write(label);
      },

      getTempName() {
        const name = `__temp${this.tempNu++}`;
        this.declare({ name });
        return name;
      },
    };

    // 开始代码转换
    statTrans(body, ctx);

    // 将线性的代码组装成
    const [head, ...tail] = ctx.statements;
    const generatorBody = SwitchStatement(
      MemberExpression(Identifier('__context'), Identifier('next')),
      tail.reduce((cases, stat) => {
        if (stat.type === 'Label') {
          cases.push(SwitchCase(Literal(stat.nu)));
        } else {
          const last = cases[cases.length - 1];
          last.consequent.push(stat);
        }
        return cases;
      }, [SwitchCase(Literal(head.nu))])
    );

    // 转换后的基本框架
    return VariableDeclaration([
      [
        Identifier(name),
        CallExpression(
          Identifier('__async'),
          [
            FunctionExpression(null, params, [
              ctx.variables.size > 0
                ? VariableDeclaration(
                  Array.from(ctx.variables).map(name => [Identifier(name), null]))
                : EmptyStatement(),

              // 转换后的函数体
              ReturnStatement(
                FunctionExpression(
                  null,
                  [Identifier('__context')],
                  [
                    generatorBody, Return(-1)
                  ]),
              ),
            ]),
          ]
        )
      ],
    ]);
  }
  // 不是 async 函数继续向下遍历
  return next(node);
});

// 转换器入口
const transform = source => {
  // 解析代码
  const sourceNode = acorn.parse(source, { ecmaVersion: 'latest' });

  // 语法检查，检查 input 代码是否符合 demo 能接受的语法，不符合报错
  checker.check(sourceNode, source);

  // 转换器入口
  const targetNode = asyncTrans(sourceNode);

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
