<script>
  import FolderIcon from "/src/folder.svg?raw";
  import PlaceHolderIcon from "/src/placeholder.svg?raw";
  import Window from "./Window.svelte";
  import Editor from "./Editor.svelte";
  import ContextMenu from "./ContextMenu.svelte";
  import InputText from "./InputText.svelte";
  import BreadCrumbs from "./BreadCrumbs.svelte";
  import * as lib from "$lib";
  import * as win from "$lib/windows.svelte.js";
  import { onMount } from "svelte";
  import { FSView } from "$lib/files";
  import { Resolver } from "$lib/resolver";
  
  let { id, layerFromId, initOffset = {x: 0, y: 0}, selection = new Resolver() } = $props();

  /** @type {HTMLDivElement | undefined} */
  let root = $state();

  let maximized = $state(false);

  let width = 320;
  let height = 260;
  let min = 150;

  let fsView = new FSView(updateFiles);
  let files = $state([]);
  let crumbs = $derived.by(() => {
    files; // re generate when files updates
    let crumbs = [];
    const pathParts = fsView.entries();
    for (let i = 1; i < pathParts.length; i++) {
      crumbs.push({
        text: pathParts[i],
        onclick: () => fsView.changeDirAbs(pathParts.slice(0, i + 1))
      });
    }
    return crumbs;
  });

  onMount(() => {
    let { initWidth, initHeight } = lib.getInitWindowSize();
    width = initWidth;
    height = initHeight;
    root.style.width = initWidth.toString() + "px";
    root.style.height = initHeight.toString() + "px";

    const inotifyChannel = new BroadcastChannel("inotify");
    inotifyChannel.onmessage = (_ev) => updateFiles();

    fsView.changeDir("persistent");
  });

  function updateFiles() {
    const entries = window.Filesystem.read_dir(fsView.cwd()).entries;
    const inPersist = fsView.hasSingleEntry("persistent");
    files = entries.map((entry) => {
      let { error, stat } = window.Filesystem.stat(fsView.relative(entry));
      if (error !== null) {
        console.log(error);
        return { type: "file", name: entry };
      }
      return { type: stat.type, name: entry };
    }).filter((entry) => {
      return !inPersist || (entry.name !== "." && entry.name !== "..");
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
    {name: "New File", onclick: newFile, shortcut: "f"},
    {name: "Create Directory", onclick: createDir, shortcut: "d"},
  ];
  let operations = $state(globalOperations);

  function fileOperations(fileName) {
    return [
      {name: "Rename File", onclick: (ev) => renameFileOrDir(fileName, ev), shortcut: "r"},
      {name: "Delete File", onclick: (ev) => deleteFile(fileName, ev), shortcut: "d", destructive: true}
    ];
  }

  function dirOperations(dirName) {
    return [
      {name: "Rename Directory", onclick: (ev) => renameFileOrDir(dirName, ev), shortcut: "r"},
      {name: "Delete Directory", onclick: (ev) => deleteDir(dirName, ev), shortcut: "d", destructive: true}
    ];
  }

  async function newFile(ev) {
    try {
      const fileName = await openTextModal("Enter new file name:", "");
      let { error, fd } = window.Filesystem.open(fsView.relative(fileName), "crw");
      if (error !== null) {
        alert("TODO handle failed to create file");
        return;
      }
      window.Filesystem.close(fd);
      updateFiles();
    } finally {
      // File name was rejected
    }
  }

  async function createDir(ev) {
    try {
      const dirName = await openTextModal("Enter new directory name:", "");
      let { error } = window.Filesystem.make_dir(fsView.relative(dirName));
      if (error !== null) {
        alert("TODO handle failed to create directory");
        return;
      }
      updateFiles();
    } finally {
      // File name was rejected
    }
  }

  async function renameFileOrDir(fileOrDirName, ev) {
    if (fsView.hasSingleEntry("persistent") && fileOrDirName === "sys") {
      alert("TODO sys/ directory cannot be renamed");
      return;
    }
    let { error, stat } = window.Filesystem.stat(fsView.relative(fileOrDirName));
    if (error !== null) {
      alert("TODO handle stat failed");
      return;
    }
    if (stat.type === "file" && !stat.perm.includes("w")) {
      alert(`TODO insufficient permissions to rename ${stat.type}`);
      return;
    }
    try {
      const newName = await openTextModal(`Rename ${stat.type}:`, fileOrDirName);
      if (newName.length !== 0) {
        window.Filesystem.move(fsView.relative(fileOrDirName), fsView.relative(newName));
      }
      updateFiles();
    } finally {
      // Rename was rejected
    }
  }

  async function deleteDir(dirName, ev) {
    if (fsView.hasSingleEntry("persistent") && dirName === "sys") {
      alert("TODO sys/ directory cannot be removed");
      return;
    }
    window.Filesystem.remove_dir(fsView.relative(dirName));
    updateFiles();
  }

  async function deleteFile(fileName, ev) {
    let { error, stat } = window.Filesystem.stat(fsView.relative(fileName));
    if (error !== null) {
      alert("TODO handle stat failed");
      return;
    }
    if (!stat.perm.includes("w")) {
      alert("TODO insufficient permissions to delete file")
      return;
    }
    window.Filesystem.remove(fsView.relative(fileName));
    updateFiles();
  }

  let openTextModal = $state();

  let showContextMenu = $state(false);
  let contextmenuX = $state(0);
  let contextmenuY = $state(0);
  /** @type {HTMLDivElement} */
  let contextmenu = $state();
  $effect(() => {
    contextmenu.style.left = contextmenuX + "px";
    contextmenu.style.top = contextmenuY + "px";
  })
  function updateContextMenu(x, y) {
    showContextMenu = true;
    contextmenuX = x;
    contextmenuY = y;
    // We cannot call focus directly as the item will
    // still be visibility hidden for the currrent frame,
    // which means the browser will not forward the key events.
    // We just request the next frame in the render loop to
    // execute acquire focus.
    requestAnimationFrame(() => contextmenu.focus());
  }

  let forwardKeydown = $state();
  function onContextMenuKey(ev) {
    ev.preventDefault(); // do not queue keystroke to future input.
    forwardKeydown(ev);
    showContextMenu = false;
  }

  function onClose() {
    if (selection !== undefined) {
      selection.reject("file selection was cancelled");
    }
  }

  function setDropZoneStyles(abs) {
    const el = document.getElementById(`fm-file-${id}-${abs}`);
    if (!el.classList.contains("fm-dropzone")) {
      el.classList.add("fm-dropzone");
    }
  }

  function removeDropZoneStyles(abs) {
    const el = document.getElementById(`fm-file-${id}-${abs}`);
    el.classList.remove("fm-dropzone");
  }

  function onDragStart(file, i) {
    return (ev) => {
      const data = {
        appid: id, // unique id for this file drag area
        type: file.type,
        absPath: fsView.relative(file.name),
      };
      ev.dataTransfer.setData("application/json", JSON.stringify(data));
      ev.dataTransfer.effectAllowed = 'move';
    }
  }

  let timer;

  function onDrop(file) {
    const abs = fsView.relativeDelim(file.name, "-");
    return (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (file.type === "directory") {
        const data = ev.dataTransfer.getData("application/json");
        console.log("DROP:", JSON.parse(data));
        removeDropZoneStyles(abs);
        if (timer !== undefined) clearTimeout(timer);
        timer = undefined;
      }
    }
  }

  function onDragOver(file) {
    // const abs = fsView.relativeDelim(file.name, "-");
    return (ev) => {
      ev.dataTransfer.dropEffect = "move";
      ev.preventDefault();
      // if (file.type === "directory") {
      //   const data = JSON.parse(ev.dataTransfer.getData("application/json"));
      //   const isSelf = id === data.appid && data.absPath.replace("/", "-") === abs;
      //   if (!isSelf) {
      //     setDropZoneStyles(abs);
      //   }
      // }
    }
  }

  // This is needed due to how broken the DND html 5 api works.
  // If you drag over a child element it raises a drag leave event for
  // the parent. We just keep a reference counter to make sure we really
  // did leave the parent element.
  let counter = 0;

  function onDragEnter(file) {
    const abs = fsView.relativeDelim(file.name, "-");
    const pathParts = [...fsView.entries(), file.name];
    return (_ev) => {
      counter++;
      if (file.type === "directory") {
        setDropZoneStyles(abs);
        if (timer !== undefined) clearTimeout(timer);
        timer = setTimeout(() => {
          fsView.changeDirAbs([]);
          for (const part of pathParts) {
            fsView.changeDir(part);
          }
        }, 500);
      }
    }
  }

  function onDragLeave(file) {
    const abs = fsView.relativeDelim(file.name, "-");
    return (_ev) => {
      counter--;
      if (file.type === "directory") {
        if (counter === 0) {
          removeDropZoneStyles(abs);
          if (timer !== undefined) clearTimeout(timer);
          timer = undefined;
        }
      }
    }
  }
</script>

<Window title="File Manager" bind:maximized {layerFromId} {id} {onResize} dataRef={root} {onClose} {initOffset}>
  {#snippet data()}
    <InputText bind:open={openTextModal}></InputText>
    <div bind:this={contextmenu} tabindex="-1" onkeydown={onContextMenuKey} class={`contextmenu ${!showContextMenu ? "hide-contextmenu" : ""}`}>
      <ContextMenu bind:keydown={forwardKeydown} items={operations}></ContextMenu>
    </div>
    <div oncontextmenu={(ev) => {
      ev.preventDefault();
      operations = globalOperations;
      updateContextMenu(ev.clientX, ev.clientY);
    }} bind:this={root} class={`file-manager ${maximized ? "file-manager-maximized" : ""}`}
      >
      <!--
      ondrop={(ev) => {
        ev.preventDefault();
        const data = ev.dataTransfer.getData("application/json");
        console.log("DROP GLOBAL:", JSON.parse(data));
      }}
      ondragover={(ev) => ev.preventDefault()}>
      -->
      {#each files as file}
        <div oncontextmenu={(ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          operations = file.type === "file" ? fileOperations(file.name) : dirOperations(file.name);
          updateContextMenu(ev.clientX, ev.clientY);
        }} class="fm-object" id={`fm-file-${id}-${fsView.relativeDelim(file.name, "-")}`} draggable="true"
          ondragstart={onDragStart(file)}
          ondrop={onDrop(file)}
          ondragover={onDragOver(file)}
          ondragenter={onDragEnter(file)}
          ondragleave={onDragLeave(file)}>
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
    <BreadCrumbs {crumbs}></BreadCrumbs>
  {/snippet}
</Window>

<svelte:window onclick={() => showContextMenu = false}/>

<style>
  :global(.file-manager-maximized) {
    width: 100% !important;
    height: 100% !important;
  }
  .file-manager {
    display: flex;
    background-color: var(--md-sys-color-background);
    padding: 0.5rem;
    flex-direction: row;
    align-items: flex-start;
    gap: 0.5rem;
    flex-wrap: wrap;
    width: inherit;
    height: inherit;
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
    padding: 0.3rem;
    border-radius: 0.4rem;
  }
  :global(.fm-icon > svg) {
    width: 4.5rem;
    height: 4.5rem;
  }
  :global(.hide-contextmenu) {
    visibility: hidden;
  }
  .contextmenu {
    position: fixed;
    z-index: 1001;
  }
  :global(.fm-dropzone) {
    background-color: var(--md-sys-color-surface-variant);
  }
</style>
