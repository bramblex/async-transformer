function getA() {
    return Promise.resolve(1);  
}

function test(b) {
  return function generator(context) {
      switch(context.next) {
          case 0: 
              return [1, getA()];
          case 1:
              const a = context.sent;
              return [-1, a + b];
      } 
  }
}

function run(generator) {
  return new Promise(resolve => {
      const context = { next: 0, sent: null };
      function step() {
          const [next, result] = generator(context);
          if (next === -1) { 
              return resolve(result);
          } else {
              context.next = next
              if (result && result.then) {
                  result.then(d => (context.sent = d, step()));
              } else {
                  context.sent = result;
                  step();
              }
          }
      }
      step();
  })
}

run(test(2)).then(console.log);