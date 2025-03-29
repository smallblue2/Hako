<script>
  import Desktop from "../components/Desktop.svelte";
  import { onMount } from "svelte";

  onMount(async () => {
    let { initialiseAPI, Filesystem } = await import("/api.mjs?url");
    window.isFilesystemInitialised = false;

    // Define a promise for loading the Emscripten module
    const LoadFilesystem = (async () => {
      try {
        // Dynamically load the emscripten module
        const { default: initEmscripten } = await import("/filesystem.mjs?url");

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
      window.isFilesystemInitialised = true;
      window.Filesystem = Filesystem;
      window._FSM = Module;

      window.Filesystem.initialiseFS();
    
      let { default: ProcessManager } = await import("/processManager.mjs?url");
      window.ProcessManager = new ProcessManager();
      console.log("Created process manager");
    }).catch((err) => {
      console.error("Failed to define filesystem API:", err);
    });
  })
</script>

<Desktop></Desktop>

<div id="event-overlay"></div>

<style>
:global(html) {
  height: 100%;
}

:global(body) {
  margin: 0;
  padding: 0;
  position: fixed;
  top: 0; right: 0; bottom: 0; left: 0;
  overflow: hidden;
}

:global(#event-overlay) {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  display: none;
  z-index: 1000;
}
</style>
