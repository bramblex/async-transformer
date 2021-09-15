

async function testFunc() {
  var i = 0;
  while (i < 10) {

    if (i % 2 === 0) {
      console.log('偶数');
    }

    i++;
  }

  var a = await hello();

  return i;
}

module.exports = testFunc;