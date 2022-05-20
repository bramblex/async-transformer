import { Node, Identifier, Kind, ScopedNode, Program } from "./ast";
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
  public readonly node: ScopedNode;
  public readonly parent?: Scope;

  // 当前作用域声明的变量(约束变量)
  private constrainedVariables: Map<string, Variable> = new Map();
  // 自由变量
  private freeVariables: Set<Variable> = new Set();
  // 子作用域
  private children: Scope[] = [];

  // 将 Scope 和 AST Node 关联起来
  constructor(type: ScopeType, node: ScopedNode, parent?: Scope) {
    this.type = type;
    // 双向关联
    this.node = node;
    node.scope = this;

    if (parent) {
      this.parent = parent;
      parent.children.push(this);
    }
  }

  // 声明变量
  declare(kind: Kind, name: string, identifier: Identifier) {
    const variable = this.constrainedVariables.get(name) || new Variable(this, kind, name, identifier);
    this.constrainedVariables.set(name, variable);
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
    identifier.variable = variable;

    return variable;
  }
}

// 作用域分析
export class ScopeAnalyzer {
  rootScope: Scope;

  constructor(root: Program, rootScope: Scope = new Scope(ScopeType.Global, root)) {
    this.rootScope = rootScope;
    traverse<Node, Scope>(root, rootScope, (node, scope, next) => {
      return next(node, scope);
    });
  }
}