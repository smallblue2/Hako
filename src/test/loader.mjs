import fs from "node:fs";

const importMap = {
  "/runtime.mjs?url": "../../build/runtime/runtime-node.mjs",
  "/signal.mjs?url": "../../build/runtime/signal.mjs",
  "/pipe.mjs?url": "../../build/runtime/pipe.mjs",
  "/common.mjs?url": "../../build/runtime/common.mjs",
  "/creflect.mjs?url": "../../glue/creflect.mjs",
  "/runtime-node.wasm?url": "../../build/runtime/runtime-node.wasm",
}

/**
 * @param specifier string
 * @param context object
 * @param nextResolve function
 */
export function resolve(specifier, context, nextResolve) {
  return nextResolve(importMap[specifier] ?? specifier);
}
