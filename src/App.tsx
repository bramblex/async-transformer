import { debounce } from 'lodash';
import * as astring from 'astring';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { stylesheet } from 'typestyle';
import { Parser } from './transformer/parser';
import { Scope, Variable } from './transformer/scope';
import { Identifier, Program } from './transformer/ast';
import { GetStateByModel, Listener, StateModel, StateModelType } from '@bramblex/state-model';
import { useModel } from '@bramblex/state-model-react';

const model = new (class extends StateModel<{ current: string }> {
  constructor() {
    super({ current: '' })
  }
})()

export function VariableBlock({ node }: { node: Identifier }) {
  useModel(model);
  const variable = node.variable;

  if (!variable) {
    throw new Error(`Unexpected error`);
  }

  let backgroundColor = '';
  if (model.state.current === variable.id) {
    if (node === variable.declaration) {
      backgroundColor = 'pink';
    } else {
      backgroundColor = 'yellow';
    }
  }

  return <span
    id={variable.id}
    className={sheet.variable}
    onMouseEnter={() => model.setState({ current: variable.id })}
    onMouseLeave={() => model.setState({ current: '' })}
    style={{ backgroundColor }}
    onClick={() => {
      const newName = prompt('请输入新的变量名', variable.name);
      if (newName && variable.name !== newName) {
        if (!variable.scope.isAvailableName(newName)) {
          alert(`变量名不合法或有冲突`);
          return;
        }
        try {
          variable.rename(newName);
          model.setState({
            current: variable.id,
          });
        } catch (err) {
          alert(`${err}`);
        }
      }
    }}
  >{node.name}</span>
}

export function createView(node: Program) {
  const chunks: JSX.Element[] = [];
  const tail = astring.generate(node, {
    generator: {
      ...astring.GENERATOR,
      Identifier: function (_node, state) {
        const node = _node as Identifier;
        if (node.variable) {
          chunks.push(<>{state.output}</>);
          chunks.push(<VariableBlock node={node} />);
          state.output = '';
        } else {
          state.write(node.name);
        }
      },
      FunctionDeclaration: function (node, state) {
        state.write(
          (node.async ? 'async ' : '') +
          (node.generator ? 'function* ' : 'function '),
          node,
        )

        if (node.id) {
          this['Identifier'](node.id, state);
        }

        const nodes = node.params as Identifier[];
        state.write('(')
        if (nodes != null && nodes.length > 0) {
          this[nodes[0].type](nodes[0], state)
          const { length } = nodes
          for (let i = 1; i < length; i++) {
            const param = nodes[i]
            state.write(', ')
            this[param.type](param, state)
          }
        }
        state.write(')')

        state.write(' ')
        this[node.body.type](node.body, state)
      },
      FunctionExpression: function (node, state) {
        return this.FunctionDeclaration(node as any, state);
      },
    }
  });

  chunks.push(<>{tail}</>);
  return <>{chunks}</>
}

export function App() {
  const [code, _setCode] = useState(() => localStorage.getItem('code-cache') || '');
  const setCode = useCallback((c: string) => {
    localStorage.setItem('code-cache', c);
    _setCode(c);
  }, []);

  const [result, setResult] = useState(<></>);

  const baseAnalyze = useCallback((source: string) => {
    try {
      const parser = new Parser();
      const program = parser.parse(source);
      Scope.analyze(program);
      setResult(createView(program));
    } catch (err) {
      const m = `${(err as Error).stack}`;
      console.error(m);
      setResult(<span style={{ color: 'red' }}>{m}</span>);
      throw err;
    }
  }, []);

  const simplify = useCallback((source: string) => {
    try {
      const parser = new Parser();
      const program = parser.parse(source);
      const scope = Scope.analyze(program);
      Scope.simplify(scope);
      setResult(createView(program));
    } catch (err) {
      const m = `${(err as Error).stack}`;
      console.error(m);
      setResult(<span style={{ color: 'red' }}>{m}</span>);
      throw err;
    }
  }, [])

  const let2var = useCallback((source: string) => {
    try {
      const parser = new Parser();
      const program = parser.parse(source);
      Scope.analyze(program);
      Scope.let2Var(program);
      setResult(createView(program));
    } catch (err) {
      const m = `${(err as Error).stack}`;
      console.error(m);
      setResult(<span style={{ color: 'red' }}>{m}</span>);
      throw err;
    }
  }, [])


  return (
    <div>

      <div>
        <h1>作用域分析</h1>

        <div className={sheet.main}>
          <div className={sheet.left}>
            <h2>代码:
            </h2>
            <textarea className={sheet.code} value={code} onChange={ev => setCode(ev.target.value)}>
            </textarea>
            <p>
              <button onClick={() => baseAnalyze(code)}>基本分析</button>{` | `}
              <button onClick={() => simplify(code)}>最少最简变量名</button>{` | `}
              <button onClick={() => let2var(code)}>let2var</button>{` | `}
              <button onClick={() => baseAnalyze(code)}>生命周期分析</button>{` | `}
            </p>
          </div>

          <div className={sheet.right}>
            <h2>结果: </h2>
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
    fontSize: '16px',
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
    margin: 0,
    minHeight: '500px',
  },

  variable: {
    cursor: 'pointer',
    color: 'blue',
    fontWeight: 'bold',
    fontSize: '18px'
  }
});
