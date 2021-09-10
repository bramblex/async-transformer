// 作用域声明
const Type = {
  Global: 'Global',
  Function: 'Function',
  Block: 'Block',
};

const Kind = {
  Var: 'var',
  Const: 'const',
  Let: 'let',
};

class Scope {
  constructor(type, parent = null) {
    this.type = type;

    this.parent = parent;
    this.children = [];
    if (this.parent) {
      this.parent.children.push(this);
    }

    this.declares = new Map();
  }

  // 声明一个变量
  declare(kind, name) {
    // var 如果定义在 block 里面，会上升到外层 function / global scope;
    // 所谓的变量提升
    if (kind === Kind.Var && this.type === Type.Block) {
      if (!this.parent) {
        throw new Error('[Scope Analyzer]:Cannot find Global Scope!');
      }
      return this.parent.declare(kind, name);
    }

    // 如果在一个作用域已经定义了，则不能允许重新定义
    const item = this.declares.get(name);
    if (item) {
      // var 这玩意是可以重复定义的
      if (kind === Kind.Var && item.kind === Kind.Var) {
        return item;
      }

      throw new Error('[Scope Analyzer]:Duplicate declare!');
    }

    // 创建一个
    const item = { name, kind };
    this.declares.set(name, item);

    return item;
  }

  find(name) {
    return this.declares.get(name);
  }
}

module.exports = {
  Type,
  Kind,
  Scope,
};
