
function Return(nu, data) {
  const elements = [
    {
      type: "Literal",
      value: nu,
    },
  ]

  if (data) {
    elements.push(data);
  }

  return {
    type: "ReturnStatement",
    argument: {
      type: "ArrayExpression",
      elements,
    }
  }
}

function Label(nu) {
  return {
    type: 'Label',
    nu,
  };
}

function IfElse(test, consequent, alternate) {
  return {
    type: 'IfStatement',
    test,
    consequent,
    alternate,
  };
}

function Identifier(name) {
  return {
    type: 'Identifier',
    name,
  }
}

function Assignment(name, expr) {
  return {
    type: "ExpressionStatement",
    expression: {
      type: "AssignmentExpression",
      operator: "=",
      left: {
        type: "Identifier",
        name,
      },
      right: expr,
    }
  }
}

function Member(obj, prop) {
  return {
    type: "MemberExpression",
    object: {
      type: "Identifier",
      name: obj,
    },
    property: {
      type: "Identifier",
      name: prop,
    },
  };
}

function Literal(value) {
  return {
    type: 'Literal',
    value,
  }
}


module.exports = {
  Return,
  Label,
  IfElse,
  Identifier,
  Assignment,
  Member,
  Literal,
};