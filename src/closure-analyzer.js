// 闭包分析器
class Closure {
  constructor(parent) {
    this.parent = parent;
    this.bounds = new Set();
  }

  bind(name) {
    this.bounds.add(name);
  }

  isBound(name) {
    return this.bounds.has(name) || (this.parent ? this.parent.isBound(name) : false);
  }
}

class ClosureAnalyzer {
  //
  getFreeVariables(node, closure = new Closure) {
  }

  // 新声明一个当前作用域无冲突的名字
  newSymbolName(referenceName, scopeNode) {
    return 'name';
  }

  // 当前作用域
  renameSymbol(oldName, referenceName, scopeNode) {
    return 'name';
  }
}

module.exports = {
  ClosureAnalyzer,
};