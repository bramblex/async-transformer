exports.traverse = function (func) {
  return function traverse(node) {
    return func(node, function next(nextNode = node) {
      if (nextNode && nextNode.type) {
        const keys = VisitorKeys[nextNode.type] || [];

        for (const key of keys) {
          const child = nextNode[key];

          if (!child) {
            continue;
          }

          if (Array.isArray(child)) {
            for (let i = 0; i < child.length; i++) {
              child[i] = traverse(child[i]);
            }
          } else {
            nextNode[key] = traverse(child);
          }
        }
      }
      return nextNode;
    }) || node;
  };
};
