const importMap = {
  "runtime-node.wasm": "../build/runtime/runtime-node.wasm"
};

Module["locateFile"] = (fileName) => {
  return importMap[fileName] ?? `/${fileName}?url`;
};
