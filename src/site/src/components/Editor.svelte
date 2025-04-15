<script lang="ts" module>
  export interface Props {
    id: number,
    layerFromId: number[],
    filePath?: string,
  }
</script>

<script lang="ts">
  import * as lib from "$lib";
  import * as win from "$lib/windows.svelte.js";
  import { Resolver } from "$lib/resolver";
  import Window from "./Window.svelte";
  import FileManager from "./FileManager.svelte";
  import _, * as overlay from "../components/Overlay.svelte";
  import Confirmation, { type OpenConfirmationFn } from "./Confirmation.svelte";
  import Alert, { type OpenAlertFn } from "./Alert.svelte";

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

  let { id, layerFromId, filePath }: Props = $props();

  let root: HTMLDivElement = $state();
  let editArea: HTMLDivElement = $state();

  let fd: number | null = null;
  let data = $state("");

  let perm = undefined;

  let view = undefined;
  let readOnly = $state(false);
  let saved = $state(true);

  let openAlertModal: OpenAlertFn = $state();

  onMount(async () => {
    let keepGoing = true;
    function abort() {
      win.closeWindow(id);
      keepGoing = false;
    }

    if (filePath === undefined) {
      if (await confirmSelectFile()) {
        let popupId: number;
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
        }).catch((_reason) => abort()) as string;
        filePath = selectedFile;
        win.closeWindow(popupId);
        overlay.toggleLoaded();
      } else {
        abort();
      }
    }
    if (!keepGoing) return;

    let stat: Stat;
    let error: FilesystemError;

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

    let timer: number;
    function debounce(fn: Function, timeout: number) {
      clearTimeout(timer);
      timer = setTimeout(fn, timeout);
    }

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        saved = false;
        debounce(onSave(update.state), 500);
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

  function onSave(state: EditorState) {
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

  let openConfirmationDialog: OpenConfirmationFn = $state();
  async function confirmSelectFile() {
    return await openConfirmationDialog();
  }

  function onMaximize() {
    root.classList.add("editor-maximized");
  }

  function onUnMaximize() {
    root.classList.remove("editor-maximized");
  }
</script>

<Window
  title={filePath === undefined ? "Editor" : `Editing ${filePath.replace("/persistent", "")}`}
  {layerFromId}
  {id}
  {onMaximize}
  {onUnMaximize}
  dataRef={root}
>
  {#snippet data()}
    <Alert bind:open={openAlertModal}></Alert>
    <Confirmation bind:open={openConfirmationDialog} title="No file opened" subtext="You must choose a file to open the editor on." confirmLabel="Select file" denyLabel="Cancel"></Confirmation>
    <div class="area" bind:this={root}>
      <div tabindex="-1" role="textbox"
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
  :global(.cm-content, .cm-gutter) {
    font-family: var(--font-mono);
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
