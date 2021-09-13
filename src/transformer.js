const acorn = require('acorn');
const astring = require('astring');
const prettier = require('prettier');
const { traverse } = require('./ast-traverse');
const { pattern, match, guard, capture } = require('./pattern-match');

/*

仅实现最基本功能 demo
1. 只支持文件根下面的 FunctionDeclare
2. 分支支持 if / else if / else
3. 循环只支持 for(;;;) / for of (仅支持数组) / while
3. 自动改无冲突变量名

没实现的
1. 不支持其他各种函数表达式，不支持函数里面嵌套定义
2. 不支持 ? : / && / || 等对控制有影响的表达式

Pass
1. 全图变量收集 / 标记 / 链接 / 引用的 scope，将信息附带到 AST 上，用于全图改名
2. 表达式分析，将 await 部分从表达式拆出来，自动添加 _temp 变量（全图无冲突）
3. 控制流分析
  1. if / else if / else 全部转换成 if / else 形式
  2. 所有循环都转换成 while 循环
  3. 将所有代码准换成 label / goto 形式
4. 将 label / goto 形式转换成 switch case 形式

Runtime
1. asyncRunner

*/

// 捕获 async 函数
const asyncFunctionPattern = pattern({
  type: 'FunctionDeclaration',
  async: true,
  body: {
    type: 'BlockStatement',
    body: capture('body'),
  },
});


const transform = source => {
  // 解析代码
  const sourceNode = acorn.parse(source, { ecmaVersion: 'latest' });

  // 转换器入口
  const traverser = traverse((node, next) => guard(node, [[pattern.unit, () => next(node)]]));

  const targetNode = traverser(sourceNode);

  // 生成代码
  const target = prettier.format(astring.generate(targetNode), {
    parser: 'babel',
  });
  return target;
};

module.exports = { transform };
