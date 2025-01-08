<script>
  import Terminal from "../components/Terminal.svelte";
  import Editor from "../components/Editor.svelte";

  let layerFromId = $state([
    0,
    1,
    2,
    3,
  ]);

  /** @type {any[]} */
  let windows = $state([
    { id: 0, component: Editor, props: { layerFromId: layerFromId, } },
    { id: 1, component: Terminal, props: { layerFromId: layerFromId, wasmModule: "/lua.mjs?url" } },
    { id: 2, component: Terminal, props: { layerFromId: layerFromId, wasmModule: "/lua.mjs?url" } },
    { id: 3, component: Editor, props: { layerFromId: layerFromId } }
  ]);

  function onWindowFocus(id, ev) {
    let maxz = Math.max(...layerFromId);
    for (let i = 0; i < layerFromId.length; i++) {
      layerFromId[i] = Math.max(0, layerFromId[i] - 1);
    }
    layerFromId[id] = maxz;
    console.log(layerFromId);
  }
</script>

{#each windows as { id, component: Component, props }}
  <Component {onWindowFocus} {id} {...props}></Component>
{/each}

<style>
:global(body) {
  margin: 0;
  padding: 0;
  position: fixed;
  top: 0; right: 0; bottom: 0; left: 0;
  overflow: hidden;
}
</style>
