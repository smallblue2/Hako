<script>
  import * as lib from "$lib/windows.svelte.js";
  import { applications, _windows } from "$lib/windows.svelte.js";
  import ContextMenu from "./ContextMenu.svelte";

  /**
   * @param {number} type
   */
  function hideMenu(type) {
    const el = document.getElementById(`context-menu-for-${type}`);
    if (el !== null) {
      el.blur();
    }
  }

  /**
   * @param {number} type
   */
  function showAll(type) {
    _windows
      .filter((win) => win.type == type)
      .filter(({ state: { show }}) => !show)
      .forEach(({ id }) => lib.showWindow(id))
    hideMenu(type);
  }

  /**
   * @param {number} type
   */
  function hideAll(type) {
    _windows
      .filter((win) => win.type == type)
      .forEach(({ id }) => lib.hideWindow(id))
    hideMenu(type);
  }

  /**
   * @param {number} type
   */
  function closeAll(type) {
    _windows
      .filter((win) => win.type == type)
      .forEach(({ id }) => lib.closeWindow(id))
    hideMenu(type);
  }

  /**
   * @param {number} type
   * @param {any} app
   */
  function newInstance(type, app) {
    app.create()
    hideMenu(type);
  }

  let forwardKeydown = $state({});
  function onContextMenuKey(type, ev) {
    ev.preventDefault(); // do not queue keystroke to future input.
    forwardKeydown[type](ev);
  }
</script>

<div class="wrapper">
  <div class="tasks">
    {#each applications as app, type}
      {#if app.alwaysShow || app.instances !== 0}
        <div>
          <div tabindex="-1" id={`context-menu-for-${type}`} onkeydown={(ev) => onContextMenuKey(type, ev)} class="menu menu-hidden"
            onfocusout={(ev) => {
              if (!ev.target.classList.contains("menu-hidden")) {
                ev.target.classList.add("menu-hidden");
              }
            }}>
            {#if app.create !== null}
              <ContextMenu bind:keydown={forwardKeydown[type]} items={[
                {name: "Close all", onclick: () => closeAll(type), shortcut: "c", destructive: true},
                {name: "Hide all", onclick: () => hideAll(type), shortcut: "h"},
                {name: "Show all", onclick: () => showAll(type), shortcut: "s"},
                {name: "New window", onclick: () => newInstance(type, app), shortcut: "n"},
              ]}></ContextMenu>
            {:else}
              <ContextMenu bind:keydown={forwardKeydown[type]} items={[
                {name: "Close all", onclick: () => closeAll(type), shortcut: "c", destructive: true},
                {name: "Hide all", onclick: () => hideAll(type), shortcut: "h"},
                {name: "Show all", onclick: () => showAll(type), shortcut: "s"},
              ]}></ContextMenu>
            {/if}
          </div>
          <button id={`button-for-${type}`} title={app.name} class={`remove-button-styles application ${app.instances !== 0 ? app.instances === 1 ? "application-one-instance" : "application-many-instances" : ""}`} onclick={() => {
            if (app.instances === 0 && app.create !== null) {
              app.create();
            } else {
              showAll(type);
            }
          }} oncontextmenu={(ev) => {
            ev.preventDefault();
            const el = document.getElementById(`context-menu-for-${type}`);
            if (el !== null) {
              el.classList.toggle("menu-hidden");
              el.focus();
            }
          }}>
            {@html app.icon}
          </button>
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .wrapper {
    display: flex;
    flex-direction: row;
    justify-content: center;
  }

  .menu {
    /*
    display: flex;
    background-color: white;
    flex-direction: column;
    list-style: none;
    padding: 0.2rem;
    background-color: var(--md-sys-color-surface);
    outline: var(--md-sys-color-outline) solid 1px;
    */
    transform: translate(calc((2.7rem * 0.5) - 50%), calc(-100% - 1rem));
    white-space: nowrap;

    width: max-content;
    position: absolute;
    margin: 0;
    opacity: 100%;
    transition: visibility 0s, opacity 0.1s linear;
  }

  .menu-hidden {
    visibility: hidden;
    opacity: 0;
  }

  .menu-hidden:focus {
    visibility: visible;
  }

  /*
  .menu-item > button {
    text-align: left;
    width: 100%;
    padding: 0.3rem 0.5rem 0.3rem 0.5rem;
    border-radius: 0.15rem;
  }

  .menu-item > button:hover {
    background-color: var(--md-sys-color-surface-dim);
  }

  .menu-divider {
    border-color: var(--md-sys-color-outline-variant);
    width: 90%;
  }
  */

  .tasks {
    display: flex;
    flex-direction: row;
    justify-content: center;
    height: 100%;
    padding: 0.3rem;
    gap: 0.5rem;
    outline: var(--md-sys-color-outline) solid 1px;
    z-index: 999;

    background: rgba(255, 255, 255, 0.2);
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(5.4px);
    -webkit-backdrop-filter: blur(5.4px);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .application {
    outline: none;
    width: 2.7rem;
    height: 2.7rem;
    display: flex;
    flex-direction: column;
  }

  :global(.application > svg) {
    width: 2.7rem;
    height: 2.7rem;
  }

  :global(.application-one-instance::before) {
    content: "";
    position: absolute;
    display: inline-block;
    transform: translate(calc((2.7rem * 0.5) - 50%), -13px);
    width: 10px;
    height: 10px;
    border-radius: 10px;
    background-color: white;
  }

  :global(.application-many-instances::before) {
    content: "";
    position: absolute;
    display: inline-block;
    transform: translate(calc((2.7rem * 0.5) - 50%), -13px);
    width: 20px;
    height: 10px;
    border-radius: 10px;
    background-color: white;
  }
</style>
