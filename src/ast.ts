import { Scope, Variable } from "./scope";

interface BaseNodeWithoutComments {
  type: string;
  loc: SourceLocation;
}

interface BaseNode extends BaseNodeWithoutComments {
  leadingComments?: Array<Comment> | undefined;
  trailingComments?: Array<Comment> | undefined;

  // 增加分析信息
  scope?: Scope;
  variable?: Variable;
}

export type Node =
  Identifier | Literal | Program | Function | SwitchCase | CatchClause |
  VariableDeclarator | Statement | Expression | Property;

export interface Comment extends BaseNodeWithoutComments {
  type: "Line" | "Block";
  value: string;
}

export interface SourceLocation {
  start: Position;
  end: Position;
}

export interface Position {
  line: number;
  column: number;
}

export interface Program extends BaseNode {
  type: "Program";
  sourceType: "script";
  body: Array<Statement>;
  comments?: Array<Comment> | undefined;
}

interface BaseFunction extends BaseNode {
  params: Array<Identifier>;
  generator?: boolean | undefined;
  async?: boolean | undefined;
  body: BlockStatement | Expression;
}

export type Function =
  FunctionDeclaration | FunctionExpression

export type Statement =
  ExpressionStatement | BlockStatement | EmptyStatement |
  DebuggerStatement | ReturnStatement | LabeledStatement |
  BreakStatement | ContinueStatement | IfStatement | SwitchStatement |
  ThrowStatement | TryStatement | WhileStatement | DoWhileStatement |
  ForStatement | ForInStatement | Declaration;

interface BaseStatement extends BaseNode { }

export interface EmptyStatement extends BaseStatement {
  type: "EmptyStatement";
}

export interface BlockStatement extends BaseStatement {
  type: "BlockStatement";
  body: Array<Statement>;
  innerComments?: Array<Comment> | undefined;
}

export interface ExpressionStatement extends BaseStatement {
  type: "ExpressionStatement";
  expression: Expression;
}

export interface IfStatement extends BaseStatement {
  type: "IfStatement";
  test: Expression;
  consequent: Statement;
  alternate?: Statement | null | undefined;
}

export interface LabeledStatement extends BaseStatement {
  type: "LabeledStatement";
  label: Identifier;
  body: Statement;
}

export interface BreakStatement extends BaseStatement {
  type: "BreakStatement";
  label?: Identifier | null | undefined;
}

export interface ContinueStatement extends BaseStatement {
  type: "ContinueStatement";
  label?: Identifier | null | undefined;
}

export interface SwitchStatement extends BaseStatement {
  type: "SwitchStatement";
  discriminant: Expression;
  cases: Array<SwitchCase>;
}

export interface ReturnStatement extends BaseStatement {
  type: "ReturnStatement";
  argument?: Expression | null | undefined;
}

export interface ThrowStatement extends BaseStatement {
  type: "ThrowStatement";
  argument: Expression;
}

export interface TryStatement extends BaseStatement {
  type: "TryStatement";
  block: BlockStatement;
  handler: CatchClause;
  finalizer?: BlockStatement | null | undefined;
}

export interface WhileStatement extends BaseStatement {
  type: "WhileStatement";
  test: Expression;
  body: Statement;
}

export interface DoWhileStatement extends BaseStatement {
  type: "DoWhileStatement";
  body: Statement;
  test: Expression;
}

export interface ForStatement extends BaseStatement {
  type: "ForStatement";
  init?: VariableDeclaration | Expression | null | undefined;
  test?: Expression | null | undefined;
  update?: Expression | null | undefined;
  body: Statement;
}

interface ForInStatement extends BaseStatement {
  type: "ForInStatement";
  left: VariableDeclaration | Identifier;
  right: Expression;
  body: Statement;
}

export interface DebuggerStatement extends BaseStatement {
  type: "DebuggerStatement";
}

export type Declaration =
  FunctionDeclaration | VariableDeclaration;

interface BaseDeclaration extends BaseStatement { }

export interface FunctionDeclaration extends BaseFunction, BaseDeclaration {
  type: "FunctionDeclaration";
  id: Identifier;
  body: BlockStatement;
}

export interface VariableDeclaration extends BaseDeclaration {
  type: "VariableDeclaration";
  declarations: Array<VariableDeclarator>;
  kind: Kind;
}

export type Kind = "var" | "let" | "const";

export interface VariableDeclarator extends BaseNode {
  type: "VariableDeclarator";
  id: Identifier;
  init?: Expression | null | undefined;
}

export type Expression =
  ThisExpression | ArrayExpression | ObjectExpression | FunctionExpression |
  YieldExpression | Literal | UnaryExpression |
  UpdateExpression | BinaryExpression | AssignmentExpression |
  LogicalExpression | MemberExpression | ConditionalExpression |
  CallExpression | NewExpression | SequenceExpression |
  Identifier | AwaitExpression;

export interface BaseExpression extends BaseNode { }

export interface ThisExpression extends BaseExpression {
  type: "ThisExpression";
}

export interface ArrayExpression extends BaseExpression {
  type: "ArrayExpression";
  elements: Array<Expression | null>;
}

export interface ObjectExpression extends BaseExpression {
  type: "ObjectExpression";
  properties: Array<Property>;
}

export interface Property extends BaseNode {
  type: "Property";
  key: Expression;
  value: Expression | Identifier;
  kind: "init" | "get" | "set";
  method: boolean;
  shorthand: boolean;
  computed: boolean;
}

export interface FunctionExpression extends BaseFunction, BaseExpression {
  id?: Identifier | null | undefined;
  type: "FunctionExpression";
  body: BlockStatement;
}

export interface SequenceExpression extends BaseExpression {
  type: "SequenceExpression";
  expressions: Array<Expression>;
}

export interface UnaryExpression extends BaseExpression {
  type: "UnaryExpression";
  operator: UnaryOperator;
  prefix: true;
  argument: Expression;
}

export interface BinaryExpression extends BaseExpression {
  type: "BinaryExpression";
  operator: BinaryOperator;
  left: Expression;
  right: Expression;
}

export interface AssignmentExpression extends BaseExpression {
  type: "AssignmentExpression";
  operator: AssignmentOperator;
  left: Identifier | MemberExpression;
  right: Expression;
}

export interface UpdateExpression extends BaseExpression {
  type: "UpdateExpression";
  operator: UpdateOperator;
  argument: Expression;
  prefix: boolean;
}

export interface LogicalExpression extends BaseExpression {
  type: "LogicalExpression";
  operator: LogicalOperator;
  left: Expression;
  right: Expression;
}

export interface ConditionalExpression extends BaseExpression {
  type: "ConditionalExpression";
  test: Expression;
  alternate: Expression;
  consequent: Expression;
}

interface BaseCallExpression extends BaseExpression {
  callee: Expression;
  arguments: Array<Expression>;
}
export type CallExpression = SimpleCallExpression | NewExpression;

export interface SimpleCallExpression extends BaseCallExpression {
  type: "CallExpression";
  optional: boolean;
}

export interface NewExpression extends BaseCallExpression {
  type: "NewExpression";
}

export interface MemberExpression extends BaseExpression {
  type: "MemberExpression";
  object: Expression;
  property: Expression;
  computed: boolean;
  optional: boolean;
}

export interface SwitchCase extends BaseNode {
  type: "SwitchCase";
  test?: Expression | null | undefined;
  consequent: Array<Statement>;
}

export interface CatchClause extends BaseNode {
  type: "CatchClause";
  param: Identifier;
  body: BlockStatement;
}

export interface Identifier extends BaseNode, BaseExpression {
  type: "Identifier";
  name: string;
}

export type Literal = SimpleLiteral | RegExpLiteral;

export interface SimpleLiteral extends BaseNode, BaseExpression {
  type: "Literal";
  value: string | boolean | number | null;
  raw?: string | undefined;
}

export interface RegExpLiteral extends BaseNode, BaseExpression {
  type: "Literal";
  value?: RegExp | null | undefined;
  regex: {
    pattern: string;
    flags: string;
  };
  raw?: string | undefined;
}

export type UnaryOperator =
  "-" | "+" | "!" | "~" | "typeof" | "void" | "delete";

export type BinaryOperator =
  "==" | "!=" | "===" | "!==" | "<" | "<=" | ">" | ">=" | "<<" |
  ">>" | ">>>" | "+" | "-" | "*" | "/" | "%" | "**" | "|" | "^" | "&" | "in" |
  "instanceof";

export type LogicalOperator = "||" | "&&" | "??";

export type AssignmentOperator =
  "=" | "+=" | "-=" | "*=" | "/=" | "%=" | "**=" | "<<=" | ">>=" | ">>>=" |
  "|=" | "^=" | "&=";

export type UpdateOperator = "++" | "--";

export interface YieldExpression extends BaseExpression {
  type: "YieldExpression";
  argument?: Expression | null | undefined;
  delegate: boolean;
}

export interface AwaitExpression extends BaseExpression {
  type: "AwaitExpression";
  argument: Expression;
}
