<script>
  import Terminal from "../components/Terminal.svelte";
  import Editor from "../components/Editor.svelte";
  import TaskBar from "../components/TaskBar.svelte";

  import * as lib from "$lib/windows.svelte.js";

  $effect(() => lib.setRootSfc(document.body));
</script>

<!-- {#each windows as { id, component: Component, props }} -->
<!--   <Component {onWindowFocus} {id} {...props}></Component> -->
<!-- {/each} -->

<div id="event-overlay"></div>
<TaskBar classList={["fixed-bottom"]}></TaskBar>

<button onclick={() => {
  lib.openWindow(Terminal, { props: { wasmModule: "/lua.mjs?url" }});
}}>Create Terminal</button>
<button onclick={() => {
  lib.openWindow(Editor);
}}>Create Editor</button>

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

:global(.fixed-bottom) {
  overflow: hidden;
  position: fixed;
  right: 0;
  height: 100%;
}
</style>
