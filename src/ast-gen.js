// 编辑

function Identifier(name) {
  return {
    type: 'Identifier',
    name,
  }
}

function Literal(value) {
  return {
    type: 'Literal',
    value,
  }
}

function ReturnStatement(argument) {
  return {
    type: "ReturnStatement",
    argument,
  }
}

function ArrayExpression(elements) {
  return {
    type: "ArrayExpression",
    elements,
  };
}

function IfStatement(test, consequent, alternate) {
  return {
    type: 'IfStatement',
    test,
    consequent,
    alternate,
  };
}

function AssignmentStatement(left, right) {
  return {
    type: "ExpressionStatement",
    expression: {
      type: "AssignmentExpression",
      operator: "=",
      left: left,
      right: right,
    }
  }
}

function MemberExpression(obj, prop) {
  return {
    type: "MemberExpression",
    object: obj,
    property: prop,
  };
}

function SwitchStatement(discriminant, cases = []) {
  return {
    type: "SwitchStatement",
    discriminant: discriminant,
    cases,
  };
}

function SwitchCase(test, consequent = []) {
  return {
    type: 'SwitchCase',
    test,
    consequent
  };
}

function FunctionExpression(id = null, params = [], body = []) {
  return {
    type: 'FunctionExpression',
    params,
    id,
    body: {
      type: 'BlockStatement',
      body,
    },
  };
}

function VariableDeclaration(declarations) {
  return {
    type: 'VariableDeclaration',
    kind: 'var',
    declarations: declarations.map(([id, init]) => ({
      type: 'VariableDeclarator',
      id,
      init,
    })),
  };
}

function CallExpression(callee, arguments = []) {
  return {
    type: 'CallExpression',
    callee,
    arguments
  };
}

function EmptyStatement() {
  return { type: 'EmptyStatement' };
}

module.exports = {
  Identifier,
  Literal,
  ReturnStatement,
  ArrayExpression,
  IfStatement,
  AssignmentStatement,
  MemberExpression,
  SwitchStatement,
  SwitchCase,
  FunctionExpression,
  VariableDeclaration,
  EmptyStatement,
  CallExpression,
};