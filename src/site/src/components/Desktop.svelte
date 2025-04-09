<script>
  import TaskBar from "./TaskBar.svelte";
  import * as lib from "$lib/windows.svelte.js";

  let root = $state();
  $effect(() => lib.setRootSfc(root));
</script>

<div id="root">
  <div id="window-area" bind:this={root}>
    <!-- <button onclick={() => { -->
    <!--   lib.openWindow(lib.TERMINAL, Terminal, { props: { wasmModule: "/runtime.js?url" }}); -->
    <!-- }}>Create Terminal</button> -->
    <!-- <button onclick={() => { -->
    <!--   lib.openWindow(lib.EDITOR, Editor); -->
    <!-- }}>Create Editor</button> -->
  </div>
  <TaskBar></TaskBar>
</div>

<style>
:global(#root) {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  z-index: -2;
}

:global(#window-area) {
  width: 100%;
  height: 100%;
}
</style>
