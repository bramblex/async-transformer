import * as estraverse from 'estraverse';

const { VisitorKeys } = estraverse;

interface BaseNode {
  type: estraverse.NodeType;
  [key: string]: any;
}

function traverseChildren<N extends BaseNode, C>(func: (node: N, ctx: C) => N) {
  return function (node: N, ctx: C) {
    for (const key of VisitorKeys[node.type]) {
      const child = node[key] as BaseNode | BaseNode[];
      if (Array.isArray(child)) {
        for (let i = 0; i < child.length; i++) {
          child[i] = child[i] && func(child[i] as N, ctx);
        }
      } else {
        (node as BaseNode)[key] = func(node[key], ctx);
      }
    }
    return node;
  }
}

export function traverse<N extends BaseNode, C>(func: (node: N, ctx: C, next: (node: N, ctx: C) => N) => N) {
  const _traverse = (node: N, ctx: C): N => func(node, ctx, _traverseChildren);
  const _traverseChildren = traverseChildren(_traverse);
  return _traverse;
};