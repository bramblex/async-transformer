const { pattern } = require('./pattern');
const { traverse } = require('./traverse');
const chalk = require('chalk');

const defaultSupported = {
  Identifier: pattern.unit,
  Literal: pattern.unit,
  Program: pattern.unit,
  ExpressionStatement: pattern.unit,
  BlockStatement: pattern.unit,
  EmptyStatement: pattern.unit,
  DebuggerStatement: pattern.unit,
  ReturnStatement: pattern.unit,
  IfStatement: pattern.unit,
  WhileStatement: pattern.unit,
  FunctionDeclaration: pattern({ generator: false }),
  VariableDeclaration: pattern({ kind: 'var' }),
  VariableDeclarator: pattern.unit,
  ArrayExpression: pattern.unit,
  ObjectExpression: pattern.unit,
  Property: pattern.unit,
  FunctionExpression: pattern({ generator: false, async: false }),
  UpdateExpression: pattern.unit,
  UnaryExpression: pattern.unit,
  BinaryExpression: pattern.unit,
  AssignmentExpression: pattern({ operator: '=' }),
  MemberExpression: pattern.unit,
  CallExpression: pattern.unit,
  NewExpression: pattern.unit,
  AwaitExpression: pattern.unit,
};


class SupportedChecker {

  constructor(supported) {
    this.supported = supported;
  }

  showError(node, source) {
    const { start, end } = node;
    let left = start;
    let topLine = 0;
    let right = end;
    let bottomLine = 0;

    while (topLine < 3 && left > 0) {
      left--;
      if (source.charAt(left) === '\n') {
        topLine++;
      }
    }

    while (bottomLine < 3 && right < source.length) {
      right++;
      if (source.charAt(right) === '\n') {
        bottomLine++;
      }
    }

    console.error(
      `\nDemo 偷懒了暂时不支持这个语法：\n` +
      source.substring(left, start) +
      chalk.bgRed(source.substring(start, end)) +
      source.substring(end, right)
    );

    process.exit(1);
  };

  check(root, source) {
    traverse((node, next) => {
      const { type } = node;
      const testFunc = this.supported[type];
      if (!testFunc || !testFunc(node)) {
        this.showError(node, source);
      }
      return next(node);
    })(root);
  }
}

module.exports = {
  SupportedChecker,
  defaultSupported,
};