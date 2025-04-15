<script lang="ts" module>
  export interface Props {
    id: number,
    layerFromId: number[],
    initOffset?: { x: number, y: number },
    selection: Resolver,
  }
</script>

<script lang="ts">
  import FolderIcon from "/src/adwaita/folder.svg?raw";
  import TextFileIcon from "/src/adwaita/text-x-generic.svg?raw";
  import Window from "./Window.svelte";
  import Editor from "./Editor.svelte";
  import ContextMenu, { type Item } from "./ContextMenu.svelte";
  import InputText, { type OpenFn } from "./InputText.svelte";
  import BreadCrumbs from "./BreadCrumbs.svelte";
  import Alert, { type OpenAlertFn } from "./Alert.svelte";
  import * as win from "$lib/windows.svelte.js";
  import { onMount } from "svelte";
  import { FSView } from "$lib/files";
  import { Resolver } from "$lib/resolver";
  import type { DragEventHandler, KeyboardEventHandler } from "svelte/elements";
  import { flip } from "svelte/animate";

  let { id, layerFromId, initOffset = {x: 0, y: 0}, selection = new Resolver() }: Props = $props();

  let selfRef: HTMLDivElement = $state();

  const enterDirDelay = 750;

  interface FileMeta {
    type: string,
    name: string,
  }

  let fsView = new FSView(updateFiles);
  let files: FileMeta[] = $state([]);
  let crumbs = $derived.by(() => {
    files; // re generate when files updates
    const rootCrumb = {text: "/", onclick: () => fsView.changeDirAbs(["persistent"])};
    let crumbs = [rootCrumb];
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
    const inotifyChannel = new BroadcastChannel("inotify");
    inotifyChannel.onmessage = (_ev) => updateFiles();
    fsView.changeDir("persistent");
  });

  function updateFiles() {
    console.log(fsView.cwd());
    const {entries, error} = window.Filesystem.read_dir(fsView.cwd());
    if (error !== null) {
      openAlertModal("Operation Failed", error);
      return;
    }
    const inPersist = fsView.hasSingleEntry("persistent");
    files = entries.map((entry) => {
      let { error, stat } = window.Filesystem.stat(fsView.relative(entry)) as StatResult;
      if (error !== null) {
        console.error(error);
        return { type: "file", name: entry };
      }
      return { type: stat.type, name: entry };
    }).filter((entry) => {
      return !inPersist || (entry.name !== "." && entry.name !== "..");
    });
  }

  function clickedFolder(file: FileMeta) {
    return () => {
      fsView.changeDir(file.name);
    };
  }

  function clickedFile(file: FileMeta) {
    return () => {
      const relFile = fsView.relative(file.name);
      if (!selection.resolve(relFile)) {
        win.openWindow(win.EDITOR, Editor, { props: { filePath: relFile } });
      }
    };
  }

  // State for the context menu of file manager
  let globalOperations: Item[] = [
    {name: "New File", onclick: newFile, shortcut: "f"},
    {name: "Create Directory", onclick: createDir, shortcut: "d"},
  ];
  let operations = $state(globalOperations);

  function fileOperations(fileName: string): Item[] {
    return [
      {name: "Rename File", onclick: (_ev) => renameFileOrDir(fileName), shortcut: "r"},
      {name: "Delete File", onclick: (_ev) => deleteFile(fileName), shortcut: "d", destructive: true}
    ];
  }

  function dirOperations(dirName: string): Item[] {
    return [
      {name: "Rename Directory", onclick: (_ev) => renameFileOrDir(dirName), shortcut: "r"},
      {name: "Delete Directory", onclick: (_ev) => deleteDir(dirName), shortcut: "d", destructive: true}
    ];
  }

  async function newFile(_ev: PointerEvent) {
    await openTextModal("Enter new file name:", "").then((fileName) => {
      let { error, fd } = window.Filesystem.open(fsView.relative(fileName), "crw");
      if (error !== null) {
        openAlertModal("Operation Failed", error);
        return;
      }
      window.Filesystem.close(fd);
      updateFiles();
    }).catch((_reason) => {}); // ignore rejection
  }

  async function createDir(_ev: PointerEvent) {
    await openTextModal("Enter new directory name:", "").then((dirName) => {;
      let { error } = window.Filesystem.make_dir(fsView.relative(dirName));
      if (error !== null) {
        openAlertModal("Operation Failed", error);
        return;
      }
      updateFiles();
    }).catch((_reason) => {}); // ignore rejection
  }

  async function renameFileOrDir(fileOrDirName: string) {
    if (fsView.hasSingleEntry("persistent") && fileOrDirName === "sys") {
      openAlertModal("Operation Failed", "'sys' directory cannot be removed");
      return;
    }
    let { error, stat } = window.Filesystem.stat(fsView.relative(fileOrDirName));
    if (error !== null) {
      openAlertModal("Operation Failed", error);
      return;
    }
    if (stat.type === "file" && !stat.perm.includes("w")) {
      openAlertModal("Operation Failed", `insufficient permissions to rename ${stat.type}`);
      return;
    }
    await openTextModal(`Rename ${stat.type}:`, fileOrDirName).then((newName) => {
      if (newName.length !== 0) {
        const { error } = window.Filesystem.move(fsView.relative(fileOrDirName), fsView.relative(newName));
        if (error !== null) {
          openAlertModal("Operation Failed", error);
          return;
        }
      }
      updateFiles();
    }).catch((_reason) => {}); // ignore rejection
  }

  async function deleteDir(dirName: string) {
    if (fsView.hasSingleEntry("persistent") && dirName === "sys") {
      openAlertModal("Operation Failed", "'sys' directory cannot be removed");
      return;
    }
    const { error } = window.Filesystem.remove_dir(fsView.relative(dirName));
    if (error !== null) {
      openAlertModal("Operation Failed", error);
      return;
    }
    updateFiles();
  }

  async function deleteFile(fileName: string) {
    let { error, stat } = window.Filesystem.stat(fsView.relative(fileName));
    if (error !== null) {
      openAlertModal("Operation Failed", error);
      return;
    }
    if (!stat.perm.includes("w")) {
      openAlertModal("Operation Failed", error);
      return;
    }
    window.Filesystem.remove(fsView.relative(fileName));
    updateFiles();
  }

  let openTextModal: OpenFn = $state();
  let openAlertModal: OpenAlertFn = $state();

  let showContextMenu = $state(false);
  let contextmenuX = $state(0);
  let contextmenuY = $state(0);
  let contextmenu: HTMLDivElement = $state();
  $effect(() => {
    contextmenu.style.left = contextmenuX + "px";
    contextmenu.style.top = contextmenuY + "px";
  })
  function updateContextMenu(x: number, y: number) {
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

  let forwardKeydown: KeyboardEventHandler<any> = $state();
  function onContextMenuKey(ev: KeyboardEvent) {
    ev.preventDefault(); // do not queue keystroke to future input.
    forwardKeydown(ev);
    showContextMenu = false;
  }

  function onClose() {
    if (selection !== undefined) {
      selection.reject("file selection was cancelled");
    }
  }

  function baseName(path: string) {
    return path.slice(path.lastIndexOf("/") + 1);
  }

  // --- Drag and drop ---
  function move(srcPath: string, destPath: string) {
    if (srcPath === "/persistent/sys") {
      openAlertModal("Operation Failed", "Cannot move 'sys' directory");
      return;
    }
    if (srcPath === destPath) {
      return;
    }
    const fileOrDirName = baseName(srcPath);
    const destWithName = destPath + (fileOrDirName.length !== 0 ? "/" : "") + fileOrDirName;
    const { error } = window.Filesystem.move(srcPath, destWithName);
    if (error !== null) {
      openAlertModal("Operation Failed", error);
      return;
    }
  }

  let fileRefs: HTMLDivElement[] = $state([]);

  function setDropZoneStyles(index: number) {
    fileRefs[index].classList.add("fm-dropzone");
  }

  function removeDropZoneStyles(index: number) {
    fileRefs[index].classList.remove("fm-dropzone");
  }

  function onDragStart<T extends EventTarget>(index: number): DragEventHandler<T> {
    return (ev) => {
      const filepath = fileRefs[index].dataset.filepath;
      const filetype = fileRefs[index].dataset.filetype;

      const data = {
        appid: id, // unique id for this file drag area
        type: filetype,
        absPath: filepath,
      };
      ev.dataTransfer.setData("application/json", JSON.stringify(data));
      ev.dataTransfer.effectAllowed = 'move';
    }
  }

  let timer: NodeJS.Timeout;

  function onDropGlobal(ev: DragEvent) {
    ev.preventDefault();
    const data = JSON.parse(ev.dataTransfer.getData("application/json"));
    const src = data.absPath;
    const dest = fsView.cwd();
    console.log("DROP GLOBAL: from", src, "to", dest);
    move(src, dest);
  }

  function onDrop<T extends EventTarget>(index: number): DragEventHandler<T> {
    return (ev) => {
      const filepath = fileRefs[index].dataset.filepath;
      const filetype = fileRefs[index].dataset.filetype;

      ev.preventDefault();
      ev.stopPropagation();
      if (filetype === "directory") {
        removeDropZoneStyles(index);
        const data = JSON.parse(ev.dataTransfer.getData("application/json"));
        const src = data.absPath;
        const dest = filepath;
        console.log("DROP: from", src, "to", filepath);
        move(src, dest);
        if (timer !== undefined) clearTimeout(timer);
        timer = undefined;
      }
    }
  }

  function onDragOver(ev: DragEvent) {
    ev.dataTransfer.dropEffect = "move";
    ev.preventDefault();
  }

  // This is needed due to how broken the DND html 5 api works.
  // If you drag over a child element it raises a drag leave event for
  // the parent. We just keep a reference counter to make sure we really
  // did leave the parent element.
  let counter = 0;

  function onDragEnter<T extends EventTarget>(index: number): DragEventHandler<T> {
    return (_ev) => {
      const filepath = fileRefs[index].dataset.filepath;
      const filetype = fileRefs[index].dataset.filetype;
      const pathParts = filepath.split("/").filter(s => s.length !== 0);

      if (filetype === "directory") {
        counter++;
        setDropZoneStyles(index);
        if (timer !== undefined) clearTimeout(timer);
        timer = setTimeout(() => {
          fsView.changeDirAbs(pathParts);
          // treat this as a sort of drag leave, reset counter and remove styles
          counter = 0;
          removeDropZoneStyles(index);
        }, enterDirDelay);
      }
    }
  }

  function onDragLeave<T extends EventTarget>(index: number): DragEventHandler<T> {
    return (_ev) => {
      const filetype = fileRefs[index].dataset.filetype;

      if (filetype === "directory") {
        if (counter !== 0) counter--; // make sure we never get negative counter
        if (counter === 0) {
          removeDropZoneStyles(index);
          if (timer !== undefined) clearTimeout(timer);
          timer = undefined;
        }
      }
    }
  }

  function onMaximize() {
    selfRef.classList.add("file-manager-maximized");
  }

  function onUnMaximize() {
    selfRef.classList.remove("file-manager-maximized");
  }
</script>

<Window title="File Manager" {layerFromId} {id} dataRef={selfRef} {onMaximize} {onUnMaximize} {onClose} {initOffset}>
  {#snippet data()}
    <Alert bind:open={openAlertModal}></Alert>
    <InputText bind:open={openTextModal}></InputText>
    <div role="menu" bind:this={contextmenu} tabindex="-1" onkeydown={onContextMenuKey} class={`contextmenu ${!showContextMenu ? "hide-contextmenu" : ""}`}>
      <ContextMenu bind:keydown={forwardKeydown} items={operations}></ContextMenu>
    </div>
    <div class="content-wrapper" bind:this={selfRef}>
      <div role="main" oncontextmenu={(ev) => {
          ev.preventDefault();
          operations = globalOperations;
          updateContextMenu(ev.clientX, ev.clientY);
        }}
          ondrop={onDropGlobal}
          ondragover={(ev) => ev.preventDefault()} class="fm-fill">
        <div class="file-manager">
          {#each files as file, index (file.name)}
            <div animate:flip={{ duration: 200 }} role="main" oncontextmenu={(ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              operations = file.type === "file" ? fileOperations(file.name) : dirOperations(file.name);
              updateContextMenu(ev.clientX, ev.clientY);
            }} class="fm-object" bind:this={fileRefs[index]} data-filetype={file.type} data-filepath={fsView.relative(file.name)} draggable="true"
              ondragstart={onDragStart(index)}
              ondrop={onDrop(index)}
              ondragover={onDragOver}
              ondragenter={onDragEnter(index)}
              ondragleave={onDragLeave(index)}>
              <button class="remove-button-styles fm-icon" onclick={file.type === "file" ? clickedFile(file) : clickedFolder(file)}>
                {#if file.type === "file"}
                  {@html TextFileIcon}
                {:else}
                  {@html FolderIcon}
                {/if}
              </button>
              <p>{file.name}</p>
            </div>
          {/each}
        </div>
      </div>
    <BreadCrumbs {crumbs}></BreadCrumbs>
    </div>
  {/snippet}
</Window>

<svelte:window onclick={() => showContextMenu = false}/>

<style>
  :global(.file-manager-maximized) {
    width: 100% !important;
    height: 100% !important;
  }

  .content-wrapper {
    display: flex;
    flex-direction: column;
  }

  .fm-fill {
    flex: 1;
    background-color: var(--md-sys-color-surface-variant);
  }

  .file-manager {
    display: flex;
    background-color: var(--md-sys-color-surface-variant);
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
    padding: 0.3rem;
    border-radius: 0.4rem;
    transition: all 300ms ease;
    outline: 1px solid var(--md-sys-color-surface-variant);
  }
  .fm-object:hover {
    outline: 1px solid var(--md-sys-color-tertiary);
    background-color: color-mix(in srgb, var(--md-sys-color-surface-variant), black 5%);
  }
  .fm-object * {
    outline: none;
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
    background-color: color-mix(in srgb, var(--md-sys-color-surface-variant), black 5%);
  }
</style>
