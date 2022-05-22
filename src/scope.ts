import { Node, Identifier, Kind, Program } from "./ast";
import { traverse } from "./traverse";

export enum ScopeType {
  Global,
  Function,
  Block
}

export class Variable {
  readonly scope: Scope;
  readonly kind: Kind;
  readonly name: string;

  readonly declaration: Identifier;
  readonly references: Identifier[] = [];

  constructor(scope: Scope, kind: Kind, name: string, identifier: Identifier) {
    this.scope = scope;
    this.kind = kind;
    this.name = name;
    this.declaration = identifier;
  }
}

// 作用域
export class Scope {
  public readonly type: ScopeType;
  public readonly node?: Node;
  public readonly parent?: Scope;

  // 当前作用域声明的变量(约束变量)
  private constrainedVariables: Map<string, Variable> = new Map();
  // 自由变量
  private freeVariables: Set<Variable> = new Set();
  // 子作用域
  private children: Scope[] = [];

  // 将 Scope 和 AST Node 关联起来
  constructor(type: ScopeType, node?: Node, parent?: Scope) {
    this.type = type;
    // 双向关联
    this.node = node;

    if (parent) {
      this.parent = parent;
      parent.children.push(this);
    }
  }

  // 声明变量
  declare(kind: Kind, name: string, identifier: Identifier): Variable {
    let scope: Scope = this;

    // 找到最近的可以声明变量的函数作用域
    while (kind === 'var' && scope.parent && scope.type !== ScopeType.Function) {
      scope = scope.parent;
    }

    const variable = this.constrainedVariables.get(name) || new Variable(this, kind, name, identifier);
    this.constrainedVariables.set(name, variable);
    return variable;
  }

  // 将 Scope 中的变量和 AST Node 上的 Identifier 关联起来
  link(name: string, identifier: Identifier): Variable {
    const variable = this.constrainedVariables.get(name);
    if (!variable) {
      if (!this.parent) {
        throw new Error(`Undeclared variable ${name}`);
      }
      const parentVariable = this.parent.link(name, identifier);
      this.freeVariables.add(parentVariable);
      return parentVariable;
    }

    // 双向关联
    variable.references.push(identifier);
    return variable;
  }
}

// 作用域分析
export class ScopeAnalyzer {
  readonly program: Program;
  readonly rootScope: Scope;
  readonly source: string;

  constructor(source: string, program: Program, rootScope: Scope = new Scope(ScopeType.Function)) {
    this.source = source;
    this.program = JSON.parse(JSON.stringify(program));
    this.rootScope = rootScope;

    // 因为会存在变量提升的问题，遍历两边做变量分析比较方便
    // 构建作用域和变量声明
    traverse<Node, Scope>(this.program, rootScope, ({ node, ctx: scope, traverseChildren }) => {
      switch (node.type) {
        case 'Program': {
          node.scope = scope;
          return traverseChildren(node, scope);
        }

        case 'SwitchStatement':
        case 'BlockStatement':
        case 'ForInStatement':
        case 'ForStatement': {
          const forScope = new Scope(ScopeType.Block, node, scope);
          node.scope = forScope;
          return traverseChildren(node, node.scope);
        }

        case 'CatchClause': {
          const catchScope = new Scope(ScopeType.Block, node, scope);
          node.param.variable = catchScope.declare('let', node.param.name, node.param);

          node.scope = catchScope;
          return traverseChildren(node, node.scope);
        }

        case 'FunctionDeclaration':
        case 'FunctionExpression': {
          const funcScope = new Scope(ScopeType.Function, node, scope);

          // 函数声明 id 声明在外部
          if (node.type === 'FunctionDeclaration') {
            const id = node.id;
            id.variable = scope.declare('var', id.name, id);
          } else if (node.type === 'FunctionExpression' && node.id) {
            // 函数表达式 id 声明在内部，如果有的话
            const id = node.id;
            id.variable = funcScope.declare('var', id.name, id);
          }

          // 声明参数
          for (const param of node.params) {
            param.variable = funcScope.declare('var', param.name, param);
          }

          node.scope = funcScope;
          return traverseChildren(node, funcScope);
        }

        case 'VariableDeclaration': {
          for (const d of node.declarations) {
            d.id.variable = scope.declare(node.kind, d.id.name, d.id);
          }
          break;
        }
      }

      node.scope = scope;
      return traverseChildren(node, scope);
    });

    // 构建变量引用
    traverse<Node>(this.program, this.program, ({ node, path, traverseChildren }) => {
      const scope = node.scope;

      if (!scope) {
        throw new Error(`Unexpected Error`);
      } else if (node.type === 'Identifier' && !node.variable) {
        const [parent, key] = path[path.length - 1];

        switch (parent.type) {

          case 'LabeledStatement':
          case 'BreakStatement':
          case 'ContinueStatement':
            return traverseChildren(node, null);

          case 'Property':
            if (key === 'key' && !parent.computed) {
              return traverseChildren(node, null);
            }
            break;

          case  'MemberExpression':
            if (key === 'program' && !parent.computed) {
              return traverseChildren(node, null);
            }
            break;
        }

        node.variable = scope.link(node.name, node);
      }

      return traverseChildren(node, null);
    });
  }

  // 变量重命名
  rename(variable: Variable, name: string) {
  }

  // 获取一个可用的变量名
  getAvailableVariableName(scope: Scope, referenceName?: string): string {
  }
}