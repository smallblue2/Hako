<script>
  import * as lib from "$lib";
  import * as win from "$lib/windows.svelte.js";
  import { Resolver } from "$lib/resolver";
  import Window from "./Window.svelte";
  import FileManager from "./FileManager.svelte";
  import _, * as overlay from "../components/Overlay.svelte";
  import Confirmation from "./Confirmation.svelte";
  import Alert from "./Alert.svelte";

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

  /** @type {HTMLDivElement | undefined} */
  let editArea = $state();

  let fd = undefined;
  let data = $state("");

  let min = 200;

  let width = 320;
  let height = 260;
  let perm = undefined;

  let view = undefined;
  let readOnly = $state(false);
  let saved = $state(true);

  let openAlertModal = $state();

  onMount(async () => {
    let { initWidth, initHeight } = lib.getInitWindowSize();
    width = initWidth;
    height = initHeight;
    root.style.width = initWidth.toString() + "px";
    root.style.height = initHeight.toString() + "px";

    let keepGoing = true;
    function abort() {
      win.closeWindow(id);
      keepGoing = false;
    }

    if (filePath === undefined) {
      if (await confirmSelectFile()) {
        let popupId;
        const selectedFile = await new Promise((res, rej) => {
          let resolver = new Resolver(res, rej);
          popupId = win.openWindow(win.FILE_MANAGER, FileManager, {
            props: {
              filePath: undefined,
              selection: resolver,
              initOffset: {x: 35, y: 35}
            },
            forceZ: overlay.zAbove()
          });
          overlay.toggleLoaded();
        }).catch((_reason) => abort());
        filePath = selectedFile;
        win.closeWindow(popupId);
        overlay.toggleLoaded();
      } else {
        abort();
      }
    }
    if (!keepGoing) return;

    let stat;
    let error;

    ({ error, stat } = window.Filesystem.stat(filePath));
    perm = stat.perm.replace("x", "");

    ({ error, fd } = window.Filesystem.open(filePath, perm));
    if (error !== null) {
      openAlertModal("Operation failed", error);
      win.closeWindow(id);
      return;
    }
    data = window.Filesystem.readAll(fd).data ?? "";
    window.Filesystem.goto(fd, 0);

    let timer;
    function debounce(fn, timeout) {
      clearTimeout(timer);
      timer = setTimeout(fn, timeout);
    }

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        saved = false;
        debounce(onSave(update.state), 2000);
      }
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
        EditorState.readOnly.of(!perm.includes("w")),
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
      parent: editArea,
    });

    readOnly = view.state.readOnly;
  });

  let maximized = $state(false);

  function onSave(state) {
    return () => {
      if (!state.readOnly) {
        window.Filesystem.goto(fd, 0);
        const text = state.doc.toString();
        window.Filesystem.write(fd, text);
        window.Filesystem.truncate(fd, text.length);
        window.Filesystem.close(fd);
        fd = window.Filesystem.open(filePath, perm).fd;
      }
      saved = true;
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

  let openConfirmationDialog = $state();
  async function confirmSelectFile() {
    return await openConfirmationDialog();
  }
</script>

<Window
  title={filePath === undefined ? "Editor" : `Editing ${filePath.replace("/persistent", "")}`}
  bind:maximized
  {layerFromId}
  {id}
  {onResize}
  dataRef={root}
>
  {#snippet data()}
    <Alert bind:open={openAlertModal}></Alert>
    <Confirmation bind:open={openConfirmationDialog} title="No file opened" subtext="You must choose a file to open the editor on." confirmLabel="Select file" denyLabel="Cancel"></Confirmation>
    <div class={`area ${maximized ? "editor-maximized" : ""}`} bind:this={root}>
      <div
        bind:this={editArea}
        onkeydown={(ev) => {
          if (ev.key == "s" && ev.ctrlKey) {
            ev.preventDefault();
            onSave(view.state)();
          }
        }}
        class="editor"
      ></div>
      <div class="editor-status">
        <div>{readOnly ? "[RO]" : "[RW]"}</div>
        <div title={readOnly ? "Cannot make changes" : saved ? "No changes" : "Unsaved changes"} class={`dot ${readOnly ? "readonly" : saved ? "saved" : "unsaved"}`}></div>
      </div>
    </div>
  {/snippet}
</Window>

<style>
  .area {
    display: flex;
    flex-direction: column;
  }
  :global(.editor) {
    font-family: var(--font-mono);
    background-color: var(--md-sys-color-background);
    flex: 1;
    overflow: scroll;
  }
  :global(.editor::-webkit-scrollbar) {
    width: 0;  /* Remove scrollbar space */
    background: transparent;  /* Optional: just make scrollbar invisible */
  }
  :global(.editor-maximized) {
    width: 100% !important;
    height: 100% !important;
    overflow: auto;
  }
  :global(.cm-editor) {
    width: 100%;
    height: 100%;
    background-color: var(--md-sys-color-background);
  }
  :global(.cm-scroller) {
    overflow: auto;
  }
  :global(.cm-editor.cm-focused) {
    outline: none;
  }
  :global(.cm-gutterElement) {
    user-select: none;
  }
  .editor-status {
    display: flex;
    flex-direction: row-reverse;
    border-top: 1px solid var(--md-sys-color-outline);
    user-select: none;
    background-color: var(--md-sys-color-surface-variant);
    padding-left: 0.5rem;
    padding-right: 0.5rem;
    align-items: center;
    gap: 0.2em;
  }
  .dot {
    aspect-ratio: 1 / 1;
    height: 1em;
    border-radius: 100%;
  }
  .saved {
    background-color: var(--md-sys-color-primary);
  }
  .unsaved {
    background-color: var(--md-sys-color-error);
  }
  .readonly {
    background-color: color-mix(in srgb, var(--md-sys-color-surface-dim), black 15%);
  }
</style>
