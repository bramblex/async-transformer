const acorn = require('acorn');
const astring = require('astring');
const prettier = require('prettier');
const { traverse } = require('./ast-traverse');
const { pattern, match, guard, capture } = require('./pattern-match');

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
