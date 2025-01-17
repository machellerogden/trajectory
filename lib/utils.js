export const sleep = (ms) =>
    new Promise(resolve => setTimeout(resolve, ms));

function _deepClone(x, visited = new WeakMap()) {
  if (x === null || typeof x !== 'object') return x;
  if (visited.has(x)) return visited.get(x);

  let cloned;

  if (Array.isArray(x)) {
    cloned = [];
    visited.set(x, cloned);
    for (const item of x) {
      cloned.push(_deepClone(item, visited));
    }
    return cloned;

  } else if (x instanceof Set) {
    cloned = new Set();
    visited.set(x, cloned);
    for (const item of x) {
      cloned.add(_deepClone(item, visited));
    }
    return cloned;

  } else if (x instanceof Map) {
    cloned = new Map();
    visited.set(x, cloned);
    for (const [k, v] of x) {
      cloned.set(_deepClone(k, visited), _deepClone(v, visited));
    }
    return cloned;

  } else if (x instanceof Date) {
    return new Date(x.getTime());

  } else if (x instanceof RegExp) {
    const clonedRegex = new RegExp(x.source, x.flags);
    clonedRegex.lastIndex = x.lastIndex;
    return clonedRegex;

  } else if (ArrayBuffer.isView(x) && !(x instanceof DataView)) {
    return new x.constructor(x);

  } else if (x instanceof ArrayBuffer) {
    return x.slice(0);

  } else if (x instanceof DataView) {
    return new DataView(x.buffer.slice(0), x.byteOffset, x.byteLength);

  } else {
    // Plain Object (or something else)
    cloned = {};
    visited.set(x, cloned);
    for (const [k, v] of Object.entries(x)) {
      cloned[k] = _deepClone(v, visited);
    }
    return cloned;
  }
}

export function deepClone(x) {
    return _deepClone(x);
}
