const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { transform } = require('./');

function log(data) {
  for (const [key, value] of Object.entries(data)) {
    console.log(`${'='.repeat(20)}[${key}]${'='.repeat(20)}`);
    console.log(value);
  }
}

async function __main__() {
  const sourceCode = fs.readFileSync(path.join(__dirname, 'example', 'input.js'), 'utf8').trim();
  log({ sourceCode });
  const targetCode = transform(sourceCode);
  log({ targetCode }); 
  fs.writeFileSync(path.join(__dirname, 'example', 'output.js'), targetCode);
  const sourceResult = await require('./example/input')();
  log({ sourceResult }); 
  const targetResult = await require('./example/output')();
  log({ targetResult }); 
  assert.deepStrictEqual(sourceResult, targetResult);
  log({ testResult: 'all pass' }); 
}

__main__();
