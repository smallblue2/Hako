<script>
  import * as lib from "$lib";
  import Window from "./Window.svelte";

  import { EditorState } from "@codemirror/state";
  import { StreamLanguage } from "@codemirror/language";
  import { lua } from "@codemirror/legacy-modes/mode/lua";

  import {
    keymap,
    highlightSpecialChars,
    drawSelection,
    dropCursor,
    rectangularSelection,
    crosshairCursor,
    lineNumbers,
    EditorView,
  } from "@codemirror/view";


  import {
    defaultKeymap,
    history,
    historyKeymap,
    indentWithTab,
  } from "@codemirror/commands";

  import { onMount } from "svelte";

  // basic setup break down from codemirror
  import {
    defaultHighlightStyle,
    syntaxHighlighting,
    indentOnInput,
    bracketMatching,
    foldGutter,
    foldKeymap,
  } from "@codemirror/language";
  import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
  import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";

  let { id, layerFromId, filePath } = $props();

  /** @type {HTMLDivElement | undefined} */
  let root = $state();

  if (filePath === undefined) {
    console.error("SHIT THE BED, should open empty file and allow user to write it");
  }

  let fd = undefined;
  let data = undefined;

  let min = 150;

  let width = 320;
  let height = 260;

  onMount(() => {
    let { initWidth, initHeight } = lib.getInitWindowSize();
    width = initWidth;
    height = initHeight;
    root.style.width = initWidth.toString() + "px";
    root.style.height = initHeight.toString() + "px";

    fd = window.Filesystem.open(filePath, "rw").fd;
    data = window.Filesystem.readAll(fd).data ?? "";
    window.Filesystem.goto(fd, 0);
  })

  let maximized = $state(false);
  let view = undefined;

  function onSave() {
    window.Filesystem.goto(fd, 0);
    window.Filesystem.write(fd, view.state.doc.text.join("\n"));
    window.Filesystem.close(fd);
    fd = window.Filesystem.open(filePath, "rw").fd;
  }

  $effect(() => {
    if (maximized) {
      root.classList.add("window-root-maximized");
    } else {
      root.classList.remove("window-root-maximized");
    }
  });

  let timer;
	function debounce(fn, timeout) {
		clearTimeout(timer);
		timer = setTimeout(fn, timeout);
	}

  $effect(() => {
    const updateListener = EditorView.updateListener.of((_update) => {
      debounce(onSave, 3000);
    })

    let startState = EditorState.create({
      doc: data,
      extensions: [
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...searchKeymap,
          indentWithTab,
        ]),
        lineNumbers(),
        drawSelection(),
        history(),
        dropCursor(),
        rectangularSelection(),
        highlightSpecialChars(),
        crosshairCursor(),
        syntaxHighlighting(defaultHighlightStyle),
        indentOnInput(),
        bracketMatching(),
        foldGutter(),
        closeBrackets(),
        highlightSelectionMatches(),
        dropCursor(),
        StreamLanguage.define(lua), // TODO only enable highlighting when in lua
        updateListener
      ],
    });

    view = new EditorView({
      state: startState,
      parent: root,
    });
  })

  /**
   * @param {number} dw
   * @param {number} dh
   */
  function onResize(dw, dh) {
    width = lib.clamp(width + dw, min);
    height = lib.clamp(height + dh, min);
    root.style.width = width.toString() + "px";
    root.style.height = height.toString() + "px";

    return true; // you can return false to say you can't resize
  }
</script>

<Window title="Editor" bind:maximized {layerFromId} {id} {onResize} dataRef={root}>
  {#snippet data()}
    <div bind:this={root} onkeydown={(ev) => {
      if (ev.key == "s" && ev.ctrlKey) {
        ev.preventDefault();
        onSave();
      }
    }} class="editor"></div> 
  {/snippet}
</Window>

<style>
:global(.cm-editor) {
  width: inherit;
  height: inherit;
  background-color: #fdffed;
}
:global(.cm-scroller) {
  font-size: 1.5em;
}
:global(.cm-editor.cm-focused) {
  outline: none;
}
</style>
