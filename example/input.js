

async function delay(n) {
  return new Promise(function (resolve) { setTimeout(resolve, n) })
}


async function testFunc() {

  return 'hello world';
}

module.exports = testFunc;