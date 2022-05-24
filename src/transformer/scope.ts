import { Node, Identifier, Kind, Program } from "./ast";
import { traverse } from "./traverse";

export enum ScopeType {
  Global,
  Function,
  Block
}

export class Variable {
  readonly scope: Scope;
  readonly referencedScope: Scope[] = [];
  readonly kind: Kind;
  name: string;

  readonly declaration: Identifier;
  readonly references: Identifier[] = [];

  constructor(scope: Scope, kind: Kind, name: string, identifier: Identifier) {
    this.scope = scope;
    this.kind = kind;
    this.name = name;
    this.declaration = identifier;
  }

  rename(name: string) {
    if (!this.scope.isAvailableName(name)) {
      throw new Error(`Variable ${name} is conflicted.`);
    }

    const oldName = this.name;

    // 更新所有引用当前变量的作用域
    this.name = name;

    // 更新所有引用该变量 Identifier 节点
    this.declaration.name = name;
    for (const ref of this.references) {
      ref.name = name;
    }

    // 更新所有引用当前变量的作用域中
    this.scope.constrainedVariables.delete(oldName);
    this.scope.constrainedVariables.set(name, this);
    for (const scope of this.referencedScope) {
      scope.freeVariables.delete(oldName);
      scope.freeVariables.set(name, this);
    }
  }
}

// 作用域
export class Scope {
  readonly type: ScopeType;
  readonly node?: Node;
  readonly parent?: Scope;

  // 当前作用域声明的变量(约束变量)
  readonly constrainedVariables: Map<string, Variable> = new Map();
  // 自由变量
  readonly freeVariables: Map<string, Variable> = new Map();
  // 子作用域
  readonly children: Scope[] = [];

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
      this.freeVariables.set(name, parentVariable);
      parentVariable.referencedScope.push(this);
      return parentVariable;
    }

    // 双向关联
    variable.references.push(identifier);
    return variable;
  }

  // 确认变量名是否可用
  isAvailableName(name: string): boolean {
    // 当前作用域中无同名的约束变量和自由变量
    return !this.constrainedVariables.has(name) && !this.freeVariables.has(name);
  }

  // 获取一个可用的变量名
  getAvailableName(referenceName: string = 'v'): string {
    const [, prefix, nu] = referenceName.match(/^([\w_\$]+?)(\d*)$/) as string[];
    let i = parseInt(nu || '0');
    for (i; this.isAvailableName(`${prefix}${i || ''}`); i++);
    return `${prefix}${i || ''}`;
  }

  // 作用域分析
  static analyze(program: Program, rootScope: Scope = new Scope(ScopeType.Function)): Scope {
    // 因为会存在变量提升的问题，遍历两边做变量分析比较方便
    // 构建作用域和变量声明
    traverse<Node, Scope>(program, rootScope, ({ node, ctx: scope, traverseChildren }) => {
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
    traverse<Node>(program, program, ({ node, path, traverseChildren }) => {
      const scope = node.scope;

      if (!scope) {
        throw new Error(`Unexpected Error`);
      } else if (node.type === 'Identifier' && !node.variable) {
        // 过滤掉声明使用的标识符

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

          case 'MemberExpression':
            if (key === 'property' && !parent.computed) {
              return traverseChildren(node, null);
            }
            break;
        }

        node.variable = scope.link(node.name, node);
      }

      return traverseChildren(node, null);
    });

    return rootScope;
  }

}
