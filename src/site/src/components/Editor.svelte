<script>
  import * as lib from "$lib";
  import Window from "../components/Window.svelte";

  import { EditorView, keymap, lineNumbers, drawSelection } from "@codemirror/view";
  import { EditorState } from "@codemirror/state";
  import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";

  let { id, layerFromId } = $props();

  /** @type {HTMLDivElement | undefined} */
  let root = $state();

  let width = 320;
  let height = 260;

  let maximized = $state(false);

  $effect(() => {
    if (maximized) {
      root.classList.add("window-root-maximized");
    } else {
      root.classList.remove("window-root-maximized");
    }
  });


  $effect(() => {
    let startState = EditorState.create({
      doc: "Hello, world!",
      extensions: [
        keymap.of(defaultKeymap),
        keymap.of(historyKeymap),
        keymap.of([indentWithTab]),
        lineNumbers(),
        drawSelection(),
        history()
      ],
    });

    let view = new EditorView({
      state: startState,
      parent: root,
    });

    root.style.width = width.toString() + "px";
    root.style.height = height.toString() + "px";
  })

  /**
   * @param {number} sect
   * @param {number} relX
   * @param {number} relY
   */
  function onResize(sect, relX, relY) {
    let dw = 0;
    let dh = 0;

    switch (sect) {
      case lib.BOTTOM_RIGHT_CORNER:
        dw = relX;
        dh = relY;
        break;
      case lib.RIGHT:
        dw = relX;
        break;
      case lib.BOTTOM:
        dh = relY;
        break;
      case lib.TOP_LEFT_CORNER:
        dw = -relX;
        dh = -relY;
        break;
      case lib.LEFT:
        dw = -relX;
        break;
      case lib.TOP:
        dh = -relY;
        break;
      case lib.TOP_RIGHT_CORNER:
        dw = relX;
        dh = -relY;
        break;
      case lib.BOTTOM_LEFT_CORNER:
        dw = -relX;
        dh = relY;
        break;
    }

    width = lib.clamp(width + dw, 100);
    height = lib.clamp(height + dh, 100);
    root.style.width = width.toString() + "px";
    root.style.height = height.toString() + "px";

    return true; // you can return false to say you can't resize
  }
</script>

<Window title="Editor" bind:maximized {layerFromId} {id} {onResize} dataRef={root}>
  {#snippet data()}
    <div bind:this={root} class="editor">
    </div>
  {/snippet}
</Window>

<style>
:global(.cm-editor) {
  width: inherit;
  height: inherit;
  background-color: #fdffed;
}
:global(.cm-editor.cm-focused) {
  outline: none;
}
</style>
