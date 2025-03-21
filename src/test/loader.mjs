const importMap = {
  "/runtime.js?url": "../../build/runtime/runtime-node.js",
  "/signal.js?url": "../../build/runtime/signal.js",
  "/pipe.js?url": "../../build/runtime/pipe.js",
  "/common.js?url": "../../build/runtime/common.js",
  "/runtime-node.wasm?url": "../../build/runtime/runtime-node.wasm"
}

/**
 * @param specifier string
 * @param context object
 * @param nextResolve function
 */
export function resolve(specifier, context, nextResolve) {
  return nextResolve(importMap[specifier] ?? specifier);
}
