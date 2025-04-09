<script>
  import FolderIcon from "/src/folder.svg?raw";
  import Window from "./Window.svelte";
  import Editor from "./Editor.svelte";
  import * as lib from "$lib";
  import * as win from "$lib/windows.svelte.js";
  import { onMount } from "svelte";

  let { id, layerFromId } = $props();

  let maximized = $state(false);
  /** @type {HTMLDivElement | undefined} */
  let root = $state();

  let width = 320;
  let height = 260;
  let min = 150;

  let currentDir = "/persistent";
  let files = $state([]);

  onMount(() => {
    let { initWidth, initHeight } = lib.getInitWindowSize();
    width = initWidth;
    height = initHeight;
    root.style.width = initWidth.toString() + "px";
    root.style.height = initHeight.toString() + "px";

    files = window.Filesystem.read_dir(currentDir).entries;

    const inotifyChannel = new BroadcastChannel("inotify");
    inotifyChannel.onmessage = (ev) => {
      console.log(ev);
      const entries = window.Filesystem.read_dir(currentDir).entries;
      console.log(entries);
      files = entries;
    };
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

<Window title="File Manager" bind:maximized {layerFromId} {id} {onResize} dataRef={root}>
  {#snippet data()}
    <div bind:this={root} class="file-manager">
      {#each files as file}
        <div class="folder">
          <button class="remove-button-styles folder-icon" onclick={() => {
            win.openWindow(win.EDITOR, Editor, { props: { filePath: `${currentDir}/${file}` } });
          }}>
            {@html FolderIcon}
          </button>
          <p>{file}</p>
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
  .folder > p {
    padding: 0;
    margin: 0;
  }
  .folder {
    display: flex;
    flex-direction: column;
    align-items: center;
    user-select: none;
  }
  :global(.folder-icon > svg) {
    width: 4.5rem;
    height: 4.5rem;
  }
</style>
