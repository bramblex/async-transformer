import * as acorn from 'acorn';
import * as astring from 'astring';
import { createLocationContext } from './location';
import { traverse } from './traverse';
import { Node } from './ast';

export class Parser {
  public supportedSyntax: Set<acorn.Node['type']> = new Set([
    'FunctionDeclaration',
    'ArrowFunctionExpression',
    'FunctionExpression',
    'YieldExpression',
    'AwaitExpression',
    'ReturnStatement',
    'ExpressionStatement',
    'Program',
    'BlockStatement',
    'EmptyStatement',
    'DebuggerStatement',
    'LabeledStatement',
    'BreakStatement',
    'ContinueStatement',
    'IfStatement',
    'SwitchStatement',
    'SwitchCase',
    'ThrowStatement',
    'TryStatement',
    'CatchClause',
    'WhileStatement',
    'DoWhileStatement',
    'ForStatement',
    'ForInStatement',
    'VariableDeclaration',
    'VariableDeclarator',
    'Property',
    'Identifier',
    'Literal',
    'ThisExpression',
    'ArrayExpression',
    'ObjectExpression',
    'UnaryExpression',
    'UpdateExpression',
    'BinaryExpression',
    'AssignmentExpression',
    'LogicalExpression',
    'MemberExpression',
    'ConditionalExpression',
    'CallExpression',
    'NewExpression',
    'SequenceExpression',
  ]);

  public defaultParseOptions: acorn.Options = {
    ecmaVersion: 2017,
    sourceType: 'script',
    locations: true,
  };

  public defaultGenerateOptions: astring.Options = {
  }

  private prepare(_root: acorn.Node, source: string): Node {
    const root = _root as Node;
    traverse<Node>(root, null, ({ node, traverseChildren }) => {
      if (!this.supportedSyntax.has(node.type)) {
        const { line, column } = node.loc.start;
        const message = `Unsupported Syntax ${node.type} at line ${line}, column ${column}\n${createLocationContext(source, { line, column })}`
        throw new Error(message);
      }
      return traverseChildren(node, null);
    });
    return root as Node;
  }

  parse(source: string) {
    return this.prepare(acorn.parse(source, this.defaultParseOptions), source);
  }

  parseExpression(source: string) {
    return this.prepare(acorn.parseExpressionAt(source, 0, this.defaultParseOptions), source);
  }

  generate(node: Node) {
    return astring.generate(node, this.defaultGenerateOptions);
  }
}