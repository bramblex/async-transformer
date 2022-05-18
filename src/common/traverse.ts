
interface Node {
  type: string;
}

const isNode = <N extends Node>(target: any): target is N =>
  target && typeof target.type === 'string';

const isNodeArray = <N extends Node>(target: any): target is N[] =>
  Array.isArray(target) && target[0] && isNode(target[0]);

const isChildNode = <N extends Node>(target: any): target is N | N[] =>
  isNodeArray(target) || isNode(target);

const getChildrenKeys = <N extends Node>(node: N): (keyof N)[] =>
  (Object.keys(node) as (keyof N)[]).filter(key => isChildNode(node[key]));

const traverseChildren = <N extends Node, C>(func: (node: N, ctx: C) => N) => (node: N, ctx: C) => {
  if (isNode(node)) {
    for (const key of getChildrenKeys(node)) {
      const child = node[key] as any as N | N[];
      if (isNodeArray(child)) {
        for (let i = 0; i < child.length; i++) {
          child[i] = child[i] && func(child[i], ctx);
        }
      } else {
        (node as any)[key] = func((node as any)[key], ctx);
      }
    }
  }
  return node;
}

export const traverse = <N extends Node, C>(func: (node: N, ctx: C, next: (node: N, ctx: C) => N) => N) => {
  const _traverse = (node: N, ctx: C): N => func(node, ctx, _traverseChildren);
  const _traverseChildren = traverseChildren(_traverse);
  return _traverse;
};