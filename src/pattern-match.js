const capture = (name, rule) => {
  const p = pattern(rule);

  return pattern.create(target => {
    if (!context) {
      return p(target);
    }

    const lastMatched = context.matched;
    context.matched = {};
    const ok = p(target);
    context.matched = ok ? { ...lastMatched, ...context.matched, [name]: target } : lastMatched;
    return ok;
  });
};

const match = pattern => target => {
  const ctx = { matched: {} };

  context = ctx;
  const ok = pattern(target);
  context = null;

  return {
    ...ctx,
    ok,
    then: next => (ok ? next(ctx.matched) : undefined),
  };
};

const guard = (value, pairs) => {
  for (const [p, func] of pairs) {
    const { ok, matched } = match(pattern(p))(value);
    if (ok) {
      return func(matched);
    }
  }
  return null;
};

const pattern = rule => {
  if (typeof rule === 'function' && rule.__pattern__ === pattern) {
    return rule;
  } else if (Array.isArray(rule)) {
    return pattern.array(rule);
  } else if (typeof rule === 'object') {
    return pattern.struct(rule);
  } else {
    return pattern.equal(rule);
  }
};

// 生成 pattern 函数
pattern.create = testFunc => {
  if (testFunc.__pattern__) {
    return testFunc;
  }
  const p = _target => testFunc(_target);
  p.__pattern__ = pattern;
  return p;
};

// 基本类
pattern.unit = pattern.create(() => true);
pattern.equal = value => pattern.create(target => target === value);

pattern.string = pattern.create(target => typeof target === 'string');
pattern.function = pattern.create(target => typeof target === 'function');
pattern.number = pattern.create(target => typeof target === 'number');
pattern.boolean = pattern.create(target => typeof target === 'boolean');

// 逻辑类
pattern.options = rules => {
  const ps = rules.map(pattern);
  return pattern.create(target => {
    for (const p of ps) {
      if (p(target)) {
        return true;
      }
    }
    return false;
  });
};

pattern.and = rules => {
  const ps = rules.map(pattern);
  return pattern.create(target => {
    for (const p of ps) {
      if (!p(target)) {
        return false;
      }
    }
    return true;
  });
};

pattern.maybe = rule => pattern.options([rule, pattern.unit]);

pattern.not = rule => {
  const p = pattern(rule);
  return pattern.create(target => !p(target));
};

// struct
pattern.struct = rule => {
  const pairs = Object.entries(rule).map(([key, subRule]) => [key, pattern(subRule)]);
  return pattern.create(target => {
    if (target && typeof target === 'object') {
      for (const [key, p] of pairs) {
        if (!p(target[key])) {
          return false;
        }
      }
      return true;
    } else {
      return false;
    }
  });
};

// tuple
pattern.tuple = function tuple(rules) {
  const ps = rules.map(pattern);
  return pattern.create(target => {
    if (Array.isArray(target)) {
      for (let i = 0; i < ps.length; i++) {
        if (!ps[i](target[i])) {
          return false;
        }
      }
      return true;
    }
    return false;
  });
};

// 数组类
pattern.array = rules => {
  const ps = rules.map(pattern);
  return pattern.create(target => {
    if (Array.isArray(target)) {
      const rs = ps.map(() => false);
      let rn = rs.length;
      for (const item of target) {
        for (let i = 0; i < ps.length; i++) {
          if (rs[i]) {
            continue;
          }
          if (ps[i](item)) {
            rs[i] = true;
            rn = rn + 1;
          }
          if (rn === 0) {
            return true;
          }
        }
      }
      return rn === 0;
    }
    return false;
  });
};

// 实例类
pattern.instance = (_class, rule = pattern.unit) =>
  pattern.and([pattern.create(target => target instanceof _class), pattern(rule)]);

// 其他基本类型
pattern.regex = regex => pattern.and([pattern.string, pattern.create(target => regex.test(target))]);

module.exports = { pattern, match, capture, guard };
