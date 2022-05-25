import { v4 as uuid } from 'uuid';
import { Node, Identifier, Kind, Program, VariableDeclaration, SequenceExpression, AssignmentExpression } from "./ast";
import { traverse } from "./traverse";

export enum ScopeType {
  Global,
  Function,
  Block
}

export class Variable {
  readonly id: string = uuid();
  readonly scope: Scope;
  readonly referencedScope: Scope[] = [];
  readonly kind: Kind;
  name: string;

  readonly declaration: Identifier | null;
  readonly references: Identifier[] = [];

  constructor(scope: Scope, kind: Kind, name: string, identifier: Identifier | null) {
    this.scope = scope;
    this.kind = kind;
    this.name = name;
    this.declaration = identifier;
  }

  rename(name: string) {
    if (!this.scope.isAvailableName(name, this)) {
      throw new Error(`Variable ${name} is conflicted.`);
    }

    const oldName = this.name;

    // 更新所有引用当前变量的作用域
    this.name = name;

    if (!this.declaration) {
      throw new Error(`Can not rename unconstrained variable`);
    }

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
  readonly id: string = uuid();
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

  getFunctionScope() {
    let scope: Scope = this;
    while (scope.parent && scope.type !== ScopeType.Function) {
      scope = scope.parent;
    }
    return scope;
  }

  // 声明变量
  declare(kind: Kind, name: string, identifier: Identifier | null): Variable {
    // 找到最近的可以声明变量的函数作用域
    let scope: Scope = kind === 'var' ? this.getFunctionScope() : this;

    const variable = scope.constrainedVariables.get(name) || new Variable(scope, kind, name, identifier);
    scope.constrainedVariables.set(name, variable);
    return variable;
  }

  // 将 Scope 中的变量和 AST Node 上的 Identifier 关联起来
  link(name: string, identifier: Identifier): Variable {
    const variable = this.constrainedVariables.get(name);
    if (!variable) {
      const parentVariable = this.parent
        ? this.parent.link(name, identifier)
        : this.declare('let', name, null);
      this.freeVariables.set(name, parentVariable);
      parentVariable.referencedScope.push(this);
      return parentVariable;
    }

    // 双向关联
    variable.references.push(identifier);
    return variable;
  }

  // 确认变量名是否可用
  isAvailableName(name: string, variable?: Variable): boolean {
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
      return false;
    }
    const v = this.constrainedVariables.get(name) || this.freeVariables.get(name);
    if (v === variable) {
      return true;
    }
    return !v;
  }

  // 获取一个可用的变量名
  getAvailableName(referenceName?: string, variable?: Variable, excludes: Set<string> = new Set()): string {
    if (referenceName) {
      const [, prefix, nu] = referenceName.match(/^([\w_$]+?)(\d*)$/) as string[];
      let i = parseInt(nu || '0');
      let name = `${prefix}${i || ''}`;
      while (!this.isAvailableName(name, variable) || excludes.has(name)) {
        i++;
        name = `${prefix}${i || ''}`;
      }
      return name;
    } else {
      function toNumberSystem26(n: number): string {
        let s = '';
        while (n > 0) {
          let m = n % 26;
          if (m === 0) m = 26;
          s = String.fromCharCode(m + 96) + s;
          n = (n - m) / 26;
        }
        return s;
      }

      let i = 1;
      let name = toNumberSystem26(i);
      while (!this.isAvailableName(name, variable) || excludes.has(name)) {
        i++;
        name = toNumberSystem26(i);
      }

      return name;
    }
  }

  // 作用域分析
  static analyze(program: Program, rootScope: Scope = new Scope(ScopeType.Function)): Scope {
    // 因为会存在变量提升的问题，遍历两边做变量分析比较方便
    // 构建作用域和变量声明
    traverse<Node, Scope>(program, rootScope, ({ node, ctx: scope, traverseChildren }) => {
      switch (node.type) {
        case 'Program': {
          node.scope = new Scope(ScopeType.Function, node, scope);
          return traverseChildren(node, node.scope);
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

  static simplify(scope: Scope) {
    for (const v of [...scope.constrainedVariables.values()]) {
      const newName = scope.getAvailableName(undefined, v);
      if (v.declaration) {
        v.rename(newName);
      }
    }
    scope.children.map(Scope.simplify);
  }

  static let2Var(program: Program): Program {
    // 提升变量声明
    traverse<Node>(program, null, ({ node, traverseChildren }) => {
      if (node.type === 'VariableDeclaration' && node.kind !== 'var') {
        for (const d of node.declarations) {
          const scope = d.scope;
          if (!scope) {
            throw new Error(`Unexpected Error`);
          }
          const funcScope = scope.getFunctionScope();
          let tmpScope = scope;
          const excludes: Set<string> = new Set();
          const variable = d.id.variable as Variable;

          while (tmpScope !== funcScope) {
            tmpScope.constrainedVariables.forEach(v => excludes.add(v.name));
            if (tmpScope === scope) {
              excludes.delete(variable.name);
            }
            tmpScope.freeVariables.forEach(v => excludes.add(v.name));
            tmpScope = tmpScope.parent as Scope;
          }

          const newName = funcScope.getAvailableName(variable.name, variable, excludes);

          variable.rename(newName);
          variable.scope.constrainedVariables.delete(variable.name);
          funcScope.constrainedVariables.set(variable.name, variable);
          scope.link(variable.name, variable.declaration as Identifier);
        }
      }

      return traverseChildren(node, null);
    });

    return traverse<Node>(program, null, ({ node, traverseChildren, path }) => {
      const [parent, key] = path[path.length - 1] || [];

      switch (node.type) {
        case 'VariableDeclaration': {
          if (parent.type === 'ForInStatement' && key === 'left') {
            node = (parent.left as VariableDeclaration).declarations[0].id
          } else {
            let seq = {
              ...(node as any),
              type: 'SequenceExpression',
              expressions: node.declarations.map(d => {
                if (!d.init) {
                  return d.id;
                }
                return {
                  ...(d as any),
                  type: 'AssignmentExpression',
                  operator: '=',
                  left: d.id,
                  right: d.init,
                } as AssignmentExpression;
              })
            }

            if (seq.expressions.length === 1) {
              seq = seq.expressions[0];
            }

            if (parent.type === 'ForStatement' && key === 'init') {
              node = seq
            } else {
              node = {
                ...(node as any),
                type: 'ExpressionStatement',
                expression: seq,
              }
            }
          }
          break;
        }


        case 'Program':
        case 'FunctionDeclaration':
        case 'FunctionExpression': {
          const scope = node.scope;
          if (!scope) {
            throw new Error(`unexpected error`);
          }
          traverseChildren(node, null);
          const body = Array.isArray(node.body) ? node.body : node.body.body;

          body.unshift({
            ...(node as any),
            type: 'VariableDeclaration',
            kind: 'var',
            declarations: [...scope.constrainedVariables.values()].map(v => {
              const id = {
                type: 'Identifier',
                name: v.name,
                scope,
                variable: v,
              } as Identifier;
              v.references.push(id);
              return {
                type: 'VariableDeclarator',
                id,
              }
            })
          });
          return node;
        }
      }

      return traverseChildren(node, null);
    }) as Program;
  }

}
