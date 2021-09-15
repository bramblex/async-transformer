function isChildNode(target) {
  return Array.isArray(target) || (target && typeof target.type === 'string');
}

function getChildrenKeys(node) {
  return Object.keys(node).filter(key => isChildNode(node[key]));
}

exports.traverse = function (func) {
  return function traverse(node) {
    return func(node, function next(nextNode) {
      if (nextNode && nextNode.type) {
        const keys = getChildrenKeys(nextNode) || [];

        for (const key of keys) {
          const child = nextNode[key];

          if (!child) {
            continue;
          }

          if (Array.isArray(child)) {
            for (let i = 0; i < child.length; i++) {
              if (child[i]) {
                child[i] = traverse(child[i]);
              }
            }
          } else {
            nextNode[key] = traverse(child);
          }
        }
      }
      return nextNode;
    });
  };
};
