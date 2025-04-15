<script lang="ts">
  import Desktop from "../components/Desktop.svelte";
  import Overlay, * as overlay from "../components/Overlay.svelte";
  import { onMount } from "svelte";
  import * as deapi from "$lib/deapi.svelte";

  let loadingPopup: HTMLDialogElement = $state();

  onMount(async () => {
    loadingPopup.showModal();

    deapi.expose();

    let { initialiseAPI, Filesystem } = await import("/api.mjs?url") as unknown as { initialiseAPI: Function, Filesystem: any };
    window.isFilesystemInitialised = false;

    // Define a promise for loading the Emscripten module
    const LoadFilesystem = (async () => {
      try {
        // Dynamically load the emscripten module
        const { default: initEmscripten } = await import("/filesystem.mjs?url") as unknown as { default: Function };

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
    
      let { default: ProcessManager } = await import("/processManager.mjs?url") as { default: any };
      window.ProcessManager = new ProcessManager();
      console.log("Created process manager");

      overlay.toggleLoaded();
      loadingPopup?.close();
    }).catch((err) => {
      console.error("Failed to define filesystem API:", err);
    });
  })
</script>

<Desktop></Desktop>

<Overlay></Overlay>
<dialog bind:this={loadingPopup} class="popup" oncancel={(e) => e.preventDefault()}>
 <div class="loader-wrapper">
   <!-- CREDIT: https://cssloaders.github.io/ -->
   <span class="loader"></span>
   <p>Starting up system...</p>
 </div>
</dialog>

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

.popup {
  outline: none;
  border: 4px solid var(--window-outline);
}

.loader-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.loader {
  color: var(--md-sys-color-on-surface);
  font-family: Consolas, Menlo, Monaco, monospace;
  font-weight: bold;
  font-size: 4rem;
  opacity: 0.8;
}

.loader:before {
  content: "{";
  display: inline-block;
  animation: pulse 0.4s alternate infinite ease-in-out;
}

.loader:after {
  content: "}";
  display: inline-block;
  animation: pulse 0.4s 0.3s alternate infinite ease-in-out;
}

@keyframes pulse {
  to {
    transform: scale(0.8);
    opacity: 0.5;
  }
}
</style>
