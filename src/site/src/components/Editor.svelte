<script>
  import * as lib from "$lib";
  import * as win from "$lib/windows.svelte.js";
  import { Resolver } from "$lib/resolver";
  import Window from "./Window.svelte";
  import FileManager from "./FileManager.svelte";

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

  let fd = undefined;
  let data = $state("");

  let min = 150;

  let width = 320;
  let height = 260;
  let perm = undefined;

  onMount(async () => {
    let { initWidth, initHeight } = lib.getInitWindowSize();
    width = initWidth;
    height = initHeight;
    root.style.width = initWidth.toString() + "px";
    root.style.height = initHeight.toString() + "px";

    if (filePath === undefined) {
      let id;
      const selectedFile = await new Promise((res, rej) => {
        let resolver = new Resolver(res, rej);
        id = win.openWindow(win.FILE_MANAGER, FileManager, {
          props: { filePath: undefined, selection: resolver },
        });
      });
      filePath = selectedFile;
      win.closeWindow(id);
    }

    let stat;
    let error;

    ({ error, stat } = window.Filesystem.stat(filePath));
    perm = stat.perm.replace("x", "");

    ({ error, fd } = window.Filesystem.open(filePath, perm));
    if (error !== null) {
      alert("SHIT BED");
    }
    data = window.Filesystem.readAll(fd).data ?? "";
    window.Filesystem.goto(fd, 0);

    let timer;
    function debounce(fn, timeout) {
      clearTimeout(timer);
      timer = setTimeout(fn, timeout);
    }

    const updateListener = EditorView.updateListener.of((_update) => {
      debounce(onSave, 3000);
    });

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
        updateListener,
      ],
    });

    view = new EditorView({
      state: startState,
      parent: root,
    });
  });

  let maximized = $state(false);
  let view = undefined;

  $effect(() => {
    if (maximized) {
      root.classList.add("window-root-maximized");
    } else {
      root.classList.remove("window-root-maximized");
    }
  });

  function onSave() {
    if (perm !== undefined && perm.includes("w")) {
      window.Filesystem.goto(fd, 0);
      const text = view.state.doc.text.join("\n");
      window.Filesystem.write(fd, text);
      window.Filesystem.truncate(fd, text.length);
      window.Filesystem.close(fd);
      fd = window.Filesystem.open(filePath, perm).fd;
    }
  }

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

<Window
  title="Editor"
  bind:maximized
  {layerFromId}
  {id}
  {onResize}
  dataRef={root}
>
  {#snippet data()}
    <div
      bind:this={root}
      onkeydown={(ev) => {
        if (ev.key == "s" && ev.ctrlKey) {
          ev.preventDefault();
          onSave();
        }
      }}
      class="editor"
    ></div>
  {/snippet}
</Window>

<style>
  :global(.cm-editor) {
    background-color: #fdffed;
  }
  :global(.cm-scroller) {
    font-size: 1.5em;
  }
  :global(.cm-editor.cm-focused) {
    outline: none;
  }
</style>
