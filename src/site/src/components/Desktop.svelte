<script>
  import TaskBar from "./TaskBar.svelte";
</script>

<div class="root">
  <div id="window-area">
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
:global(#window-area::-webkit-scrollbar) {
    width: 0;  /* Remove scrollbar space */
    background: transparent;  /* Optional: just make scrollbar invisible */
}
</style>
