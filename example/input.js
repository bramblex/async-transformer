
function delay(n, value) {
  return new Promise(function (resolve) {
    setTimeout(function () { resolve(value) }, n);
  });
}

async function testFunc() {
  var i = 0;
  var sum = 0;
  var d = 0;
  while (i < 10) {
    d = d + await delay(1e2, await delay(1e2, i));
    sum = sum + d;

    i++;
  }

  var arr = [];
  arr[await delay(1e2, 10)] = 123;

  return sum;
}

module.exports = testFunc;