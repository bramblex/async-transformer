// function createCounter() {
//   const skip = {};
//   const context = {
//     sent: null,
//     next: 0,
//   };

//   let i = 0;

//   function next() {
//   }

//   return {
//     next
//   }
// }

// function __generator(creator) {
//   return function () {
//     var generator = creator.apply(null, arguments);
//     var context = {
//       next: 0,
//       sent: null,
//     };

//     return {
//       next: function next() {
//         const [_next, value] = generator(context);
//         context.next = _next;
//         if (value === __generator.skip) {
//           return next();
//         }
//         return {
//           value,
//         }
//       }
//     };
//   }
// }
// __generator.skip = {};

// const createCounter = __generator(function () {
//   let i;
//   return function (context) {
//     switch (context.next) {
//       case 0:
//         i = 0;
//       case 1:
//         return [2, i];
//       case 2:
//         i++;
//         return [1, __generator.skip];
//     }
//   }
// });

// const counter = createCounter();

// console.log(counter.next());
// console.log(counter.next());
// console.log(counter.next());
// console.log(counter.next());
// console.log(counter.next());
// console.log(counter.next());

//   function step(context) {
//     switch (context.next) {
//       case 0:
//         return [1, i]; // 中间一处 yield 打断
//       case 1:
//         i++;
//         return [0, skip];
//     }
//   };

const { traverse } = require('../src/traverse');
const acorn = require('acorn');
const astring = require('astring');

const exprReplacer = traverse(function (node, ctx, next) {
  return (({
    Program: () => {
      // 创建一个 ctx，stats 用来收集新生成的指令
      const ctx = { stats: [], varNu: 0 };
      next(node, ctx);
      node.body = [...ctx.stats, ...node.body];
      return node;
    },
    BinaryExpression: () => {
      next(node, ctx);
      const varName = 'var' + ctx.varNu++;

      ctx.stats.push({
        type: 'VariableDeclaration',
        kind: 'const',
        declarations: [{
          type: 'VariableDeclarator',
          id: { type: 'Identifier', name: varName },
          init: node,
        }],
      });

      return {
        type: 'Identifier',
        name: varName,
      };
    },
  }[node.type]) || (() => next(node, ctx)))();
});

const source = `
  const num = 1 + 2 - 3 / 4 * 5;
`;
const target = astring.generate(
  exprReplacer(
    acorn.parse(source, { ecmaVersion: 'latest' })
  )
);
console.log(target);