import { debounce } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { stylesheet } from 'typestyle';
import { Parser } from './transformer/parser';
import { Scope } from './transformer/scope';

export function App() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState(<></>);

  const calculate = useMemo(() => debounce(function calculate(source: string) {
    const parser = new Parser();
    const program = parser.parse(source);
    const scope = Scope.analyze(program);
  }, 1e3), []);

  useEffect(() => {
    calculate(code);
  }, [code]);

  return (
    <div>

      <div>
        <h1>作用域分析</h1>

        <div className={sheet.main}>
          <div className={sheet.left}>
            <h2>代码:</h2>
            <textarea className={sheet.code} value={code} onChange={ev => setCode(ev.target.value)}>
            </textarea>
          </div>

          <div className={sheet.right}>
            <h2>结果:</h2>
            <pre className={sheet.view}>
              {result}
            </pre>
          </div>
        </div>

      </div>

    </div>
  );
}

const sheet = stylesheet({
  main: {
    display: 'flex',
  },

  left: {
    flex: 1,
    margin: '8px',

    display: 'flex',
    flexDirection: 'column',
  },

  right: {
    flex: 1,
    margin: '8px',

    display: 'flex',
    flexDirection: 'column',
  },

  code: {
    height: '500px',
  },

  view: {
    padding: '6px',
    backgroundColor: '#efefef',
    minHeight: '500px',
  }
});
