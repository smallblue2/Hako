<script>
  import FolderIcon from "/src/folder.svg?raw";
  import PlaceHolderIcon from "/src/placeholder.svg?raw";
  import Window from "./Window.svelte";
  import Editor from "./Editor.svelte";
  import ContextMenu from "./ContextMenu.svelte";
  import InputText from "./InputText.svelte";
  import * as lib from "$lib";
  import * as win from "$lib/windows.svelte.js";
  import { onMount } from "svelte";
  import { FSView } from "$lib/files";
  import { Resolver } from "$lib/resolver";
  
  let { id, layerFromId, selection = new Resolver() } = $props();

  let maximized = $state(false);
  /** @type {HTMLDivElement | undefined} */
  let root = $state();

  let width = 320;
  let height = 260;
  let min = 150;

  let fsView = new FSView(updateFiles);
  let files = $state([]);

  onMount(() => {
    let { initWidth, initHeight } = lib.getInitWindowSize();
    width = initWidth;
    height = initHeight;
    root.style.width = initWidth.toString() + "px";
    root.style.height = initHeight.toString() + "px";

    fsView.changeDir("persistent")

    const inotifyChannel = new BroadcastChannel("inotify");
    inotifyChannel.onmessage = (ev) => {
      updateFiles();
    };
  })

  function updateFiles() {
    const entries = window.Filesystem.read_dir(fsView.cwd()).entries;
    files = entries.map((entry) => {
      let { error, stat } = window.Filesystem.stat(fsView.relative(entry));
      if (error !== null) {
        console.log(error);
        return { type: "file", name: entry };
      }
      return { type: stat.type, name: entry };
    });
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

  function clickedFolder(file) {
    return () => {
      fsView.changeDir(file.name);
    };
  }

  function clickedFile(file) {
    return () => {
      const relFile = fsView.relative(file.name);
      if (!selection.resolve(relFile)) {
        win.openWindow(win.EDITOR, Editor, { props: { filePath: relFile } });
      }
    };
  }

  // State for the context menu of file manager
  let rightClick = $state();
  let globalOperations = [
    {name: "New File", onclick: newFile},
    {name: "Create Directory", onclick: createDir},
  ];
  let operations = $state(globalOperations);

  function newFile(ev) {
    console.log("TODO");
  }

  function createDir(ev) {
    console.log("TODO");
  }

  async function renameFile(fileName, ev) {
    const newName = await openRenameFileModal("Rename File", fileName);
    if (newName.length !== 0) {
      window.Filesystem.move(fsView.relative(fileName), fsView.relative(newName));
    }
  }

  let openRenameFileModal = $state();
</script>

<Window title="File Manager" bind:maximized {layerFromId} {id} {onResize} dataRef={root}>
  {#snippet data()}
    <InputText bind:open={openRenameFileModal}></InputText>
    <ContextMenu bind:oncontextmenu={rightClick} items={operations}></ContextMenu>
    <div oncontextmenu={(ev) => {
      operations = globalOperations;
      rightClick(null, ev);
    }} bind:this={root} class="file-manager">
      {#each files as file}
        <div oncontextmenu={(ev) => {
          ev.stopPropagation();
          operations = file.type === "file" ? [
            {name: "Rename File", onclick: (ev) => renameFile(file.name, ev)}
          ] : globalOperations;
          rightClick(file, ev);
        }} class="fm-object">
          <button class="remove-button-styles fm-icon" onclick={file.type === "file" ? clickedFile(file) : clickedFolder(file)}>
            {#if file.type === "file"}
              {@html PlaceHolderIcon}
            {:else}
              {@html FolderIcon}
            {/if}
          </button>
          <p>{file.name}</p>
        </div>
      {/each}
    </div>
  {/snippet}
</Window>

<style>
  .file-manager {
    display: flex;
    background-color: var(--md-sys-color-background);
    padding: 0.5rem;
    flex-direction: row;
    align-items: flex-start;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .fm-object > p {
    padding: 0;
    margin: 0;
  }
  .fm-object {
    display: flex;
    flex-direction: column;
    align-items: center;
    user-select: none;
  }
  :global(.fm-icon > svg) {
    width: 4.5rem;
    height: 4.5rem;
  }
</style>
