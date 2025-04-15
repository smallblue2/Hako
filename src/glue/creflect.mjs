// Below are all helpers to access exported variables from C emscripten C emscripten modules.
// This allows us to get size of structs aswell as the offsets of their
// fields in js.
export function sizeof(M, structName) {
  const symbolName = `_sizeof_${structName}`;
  const symbol = M[symbolName];
  if (symbol === undefined) {
    throw new Error("symbol not found: " + symbolName);
  }
  return M.getValue(symbol, 'i32');
}

export function offsetof(M, structName, field) {
  const symbolName = `_offsetof_${structName}__${field}`;
  const symbol = M[symbolName];
  if (symbol === undefined) {
    throw new Error("symbol not found: " + symbolName);
  }
  return M.getValue(M[symbolName], 'i32');
}

export function derefi32(M, ptr, structName, field) {
  return M.getValue(ptr + offsetof(M, structName, field), 'i32');
}

export class StructView {
  M;
  ptr;
  structName;
  constructor(M, structName, ptr) {
    this.M = M;
    this.ptr = ptr;
    this.structName = structName;
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (prop in target) {
          return Reflect.get(target, prop, receiver);
        }
        return derefi32(target.M, target.ptr, target.structName, prop);
      },
      set(target, prop, newValue, receiver) {
        if (prop in target) {
          return Reflect.set(target, prop, newValue, receiver);
        }
        M.setValue(target.ptr + target.offsetof(prop), newValue, 'i32');
        return true;
      }
    });
  }
  offsetof(field) {
    return offsetof(this.M, this.structName, field);
  }
  addressof(field) {
    return this.ptr + this.offsetof(field);
  }
}
