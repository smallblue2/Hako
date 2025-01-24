<script>
  import Terminal from "../components/Terminal.svelte";
  import Editor from "../components/Editor.svelte";
  import TaskBar from "../components/TaskBar.svelte";

  import * as lib from "$lib/windows.svelte.js";

  let root = $state();

  $effect(() => lib.setRootSfc(root));
</script>

<div bind:this={root}></div>
<div id="event-overlay"></div>

<button onclick={() => {
  lib.openWindow(Terminal, { props: { wasmModule: "/lua.mjs?url" }});
  lib.openWindow(Terminal, { props: { wasmModule: "/lsc.js?url" }});
}}>Create Terminal</button>
<button onclick={() => {
  lib.openWindow(Editor);
}}>Create Editor</button>

<TaskBar classList={["fixed-right"]}></TaskBar>

<style>
:global(body) {
  margin: 0;
  padding: 0;
  position: fixed;
  top: 0; right: 0; bottom: 0; left: 0;
  overflow: hidden;
}

:global(#event-overlay) {
  /* background: rgba(0,0,0,0.7); */
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  display: none;
  z-index: 1000;
}

:global(.fixed-right) {
  overflow: hidden;
  position: fixed;
  right: 0;
  height: 100%;
}
</style>
