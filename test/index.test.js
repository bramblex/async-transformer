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
    d = d + await delay(1e1, await delay(1e1, i));
    sum = sum + d;

    i++;
    if (i < 5) {
      sum++;
    } else {
      sum--;
    }
  }

  var arr = [];
  arr[await delay(1e2, 10)] = 123;

  return sum + arr[10];
}

async function test(n) {
  var i = 10;
  var sum = 0;
  while (i > 0) {
      sum = sum + await getA();
  }
  return sum;
}