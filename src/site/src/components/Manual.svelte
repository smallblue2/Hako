<script lang="ts" module>
  export interface Props {
    id: number,
    layerFromId: number[],
  }
</script>

<script lang="ts">
  import Window from "./Window.svelte";
  let { id, layerFromId }: Props = $props();
  let selfRef: HTMLElement = $state();

  function onMaximize() {
    selfRef.classList.add("manual-maximized");
  }

  function onUnMaximize() {
    selfRef.classList.remove("manual-maximized");
  }

  function onMove() {
    selfRef.classList.add("manual-moving");
  }

  function onStop() {
    selfRef.classList.remove("manual-moving");
  }
</script>

<Window title="Manual" {layerFromId} {id} dataRef={selfRef} {onMaximize} {onUnMaximize} {onMove} {onStop}>
  {#snippet data()}
    <div class="manual" bind:this={selfRef}>
      <iframe src="/doc/index.html" title="Manual"></iframe>
    </div>
  {/snippet}
</Window>

<style>
  :global(.manual-maximized) {
    width: 100% !important;
    height: 100% !important;
  }
  .manual > iframe {
    border: none;
    width: 100%;
    height: 100%;
  }
  :global(.manual-moving > iframe) {
    user-select: none;
    pointer-events: none;
  }
</style>
