import { initialiseAPI, Filesystem } from "../filesystem/api/api.mjs";
import fs from "fs";
import assert from "node:assert";

globalThis.Filesystem = Filesystem

let isFilesystemInitialised = false;
let _FSM;

// Define a promise for loading the Emscripten module
const LoadFilesystem = (async () => {
  try {
    // Dynamically load the emscripten module
    const { default: initEmscripten } = await import("../../build/filesystem/filesystem.mjs");

    // Initialise the emscripten module
    const Module = await initEmscripten({
      onRuntimeInitialized: () => {
        console.log("Filesystem Emscripten module loaded.");
      },
      noExitRuntime: false
    });

    return Module
  } catch (err) {
    console.error("Filesystem Emscripten module failed to load:", err);
    throw err;
  }
})();

LoadFilesystem.then(async (Module) => {
  // Initialised the Filesystem API
  initialiseAPI(Module);
  // Attach to the global scope
  globalThis.isFilesystemInitialised = true;
  globalThis._FSM = Module;

  Filesystem.initialiseFSNode();

  await main();
}).catch((err) => {
  console.error("Failed to define filesystem API:", err);
});

async function main() {
  // Copy test lua file into our filesystem
  const luaCode = fs.readFileSync("./test/integration.lua").toString();

  let { error, fd } = Filesystem.open("/integration.lua", "wc");
  assert(error === null, "error in test setup");
  ({ error } = Filesystem.write(fd, luaCode));
  assert(error === null, "error in test setup");
  ({ error } = Filesystem.close(fd));
  assert(error === null, "error in test setup");

  let { default: ProcessManager } = await import("../../build/processes/processManager.mjs");
  let procmgr = new ProcessManager();
  globalThis.ProcessManager = procmgr;

  globalThis.pid = await procmgr.createProcess({ luaPath: "/integration.lua", pipeStdin: true, pipeStdout: false, start: true});
  globalThis.chan = new BroadcastChannel("process");
  globalThis.chan.onmessage = (ev) => {
    if (ev.data.pid == globalThis.pid) {
      onExit(ev.data);
      globalThis.chan.close();
      globalThis.ProcessManager.deinit();
    }
  }
}

function onExit({ exitCode }) {
  process.stdout.write("");
  assert(exitCode == 0);
}
