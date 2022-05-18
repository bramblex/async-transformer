import { Node, Identifier, Kind, ScopedNode } from "./ast";

export class Variable {
  readonly kind: Kind;
  readonly name: string;

  readonly declaration: Identifier;
  readonly references: Identifier[] = [];

  constructor(kind: Kind, name: string, identifier: Identifier) {
    this.kind = kind;
    this.name = name;
    this.declaration = identifier;
  }
}

// 作用域
export class Scope {
  public readonly node: ScopedNode;
  public readonly parent?: Scope;

  private content: Map<string, Variable> = new Map();
  private children: Scope[] = [];

  // 将 Scope 和 AST Node 关联起来
  constructor(node: ScopedNode, parent?: Scope) {
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
    const variable = this.content.get(name) || new Variable(kind, name, identifier);
    this.content.set(name, variable);
  }

  // 将 Scope 中的变量和 AST Node 上的 Identifier 关联起来
  link(name: string, identifier: Identifier): Variable {
    const variable = this.content.get(name);
    if (!variable) {
      if (!this.parent) {
        throw new Error(`Undeclared variable ${name}`);
      }
      return this.parent.link(name, identifier);
    }

    // 双向关联
    variable.references.push(identifier);
    identifier.variable = variable;

    return variable;
  }
}
