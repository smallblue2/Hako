<script>
  import TaskBar from "./TaskBar.svelte";
  import * as lib from "$lib/windows.svelte.js";

  let root = $state();
  $effect(() => lib.setRootSfc(root));
</script>

<div class="root">
  <div id="window-area" bind:this={root}>
  </div>
  <TaskBar></TaskBar>
</div>

<style>
.root {
  /*
  display: flex;
  flex-direction: column;
  */
  display: grid;
  grid-template-rows: 1fr auto;
  width: 100%;
  height: 100%;
  z-index: -2;
}

:global(#window-area) {
  width: 100%;
  height: 100%;
  overflow: scroll;
}
</style>
