
interface TraverseNode {
  type: keyof typeof VisitorKeys;
  [key: string]: any;
}

type TraversePath<N extends TraverseNode> = [N, string, number][];

export const VisitorKeys = {
  AssignmentExpression: ['left', 'right'],
  AssignmentPattern: ['left', 'right'],
  ArrayExpression: ['elements'],
  ArrayPattern: ['elements'],
  ArrowFunctionExpression: ['params', 'body'],
  AwaitExpression: ['argument'],
  BlockStatement: ['body'],
  BinaryExpression: ['left', 'right'],
  BreakStatement: ['label'],
  CallExpression: ['callee', 'arguments'],
  CatchClause: ['param', 'body'],
  ChainExpression: ['expression'],
  ClassBody: ['body'],
  ClassDeclaration: ['id', 'superClass', 'body'],
  ClassExpression: ['id', 'superClass', 'body'],
  ComprehensionBlock: ['left', 'right'],
  ComprehensionExpression: ['blocks', 'filter', 'body'],
  ConditionalExpression: ['test', 'consequent', 'alternate'],
  ContinueStatement: ['label'],
  DebuggerStatement: [],
  DirectiveStatement: [],
  DoWhileStatement: ['body', 'test'],
  EmptyStatement: [],
  ExportAllDeclaration: ['source'],
  ExportDefaultDeclaration: ['declaration'],
  ExportNamedDeclaration: ['declaration', 'specifiers', 'source'],
  ExportSpecifier: ['exported', 'local'],
  ExpressionStatement: ['expression'],
  ForStatement: ['init', 'test', 'update', 'body'],
  ForInStatement: ['left', 'right', 'body'],
  ForOfStatement: ['left', 'right', 'body'],
  FunctionDeclaration: ['id', 'params', 'body'],
  FunctionExpression: ['id', 'params', 'body'],
  GeneratorExpression: ['blocks', 'filter', 'body'],
  Identifier: [],
  IfStatement: ['test', 'consequent', 'alternate'],
  ImportExpression: ['source'],
  ImportDeclaration: ['specifiers', 'source'],
  ImportDefaultSpecifier: ['local'],
  ImportNamespaceSpecifier: ['local'],
  ImportSpecifier: ['imported', 'local'],
  Literal: [],
  LabeledStatement: ['label', 'body'],
  LogicalExpression: ['left', 'right'],
  MemberExpression: ['object', 'property'],
  MetaProperty: ['meta', 'property'],
  MethodDefinition: ['key', 'value'],
  ModuleSpecifier: [],
  NewExpression: ['callee', 'arguments'],
  ObjectExpression: ['properties'],
  ObjectPattern: ['properties'],
  PrivateIdentifier: [],
  Program: ['body'],
  Property: ['key', 'value'],
  PropertyDefinition: ['key', 'value'],
  RestElement: ['argument'],
  ReturnStatement: ['argument'],
  SequenceExpression: ['expressions'],
  SpreadElement: ['argument'],
  Super: [],
  SwitchStatement: ['discriminant', 'cases'],
  SwitchCase: ['test', 'consequent'],
  TaggedTemplateExpression: ['tag', 'quasi'],
  TemplateElement: [],
  TemplateLiteral: ['quasis', 'expressions'],
  ThisExpression: [],
  ThrowStatement: ['argument'],
  TryStatement: ['block', 'handler', 'finalizer'],
  UnaryExpression: ['argument'],
  UpdateExpression: ['argument'],
  VariableDeclaration: ['declarations'],
  VariableDeclarator: ['id', 'init'],
  WhileStatement: ['test', 'body'],
  WithStatement: ['object', 'body'],
  YieldExpression: ['argument']
} as const;

export function traverseChildren<N extends TraverseNode, C>(node: N, ctx: C, traverse: (node: N, ctx: C, path: TraversePath<N>) => N, path: TraversePath<N>) {
  for (const key of VisitorKeys[node.type]) {
    const child = node[key] as TraverseNode | TraverseNode[];
    if (Array.isArray(child)) {
      for (let i = 0; i < child.length; i++) {
        child[i] = child[i] && traverse(child[i] as N, ctx, [...path, [child[i] as N, key, i]]);
      }
    } else {
      (node as TraverseNode)[key] = traverse(node[key], ctx, [...path, [child as N, key, 0]]);
    }
  }
  return node;
}

export function createTraverse<N extends TraverseNode, C = unknown>(
  traverse: (params: { node: N, ctx: C, path: TraversePath<N>, traverseChildren: (node: N, ctx: C) => N }) => N,
) {
  const _traverse: (node: N, ctx: C, path: TraversePath<N>) => N
    = (node: N, ctx: C, path: TraversePath<N>) =>
      traverse({ node, ctx, path, traverseChildren: (node: N, ctx: C) => traverseChildren(node, ctx, _traverse, path) });
  return (node: N, ctx: C) => _traverse(node, ctx, []);
};

export function traverse<N extends TraverseNode, C = unknown>(
  node: N, ctx: C,
  traverse: (params: { node: N, ctx: C, path: TraversePath<N>, traverseChildren: (node: N, ctx: C) => N }) => N,
) {
  const _traverse = createTraverse(traverse);
  return _traverse(node, ctx);
};
