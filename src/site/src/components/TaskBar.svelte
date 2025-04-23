<script lang="ts">
  import * as lib from "$lib/windows.svelte.js";
  import { applications as _applications, _windows } from "$lib/windows.svelte.js";
  import ContextMenu from "./ContextMenu.svelte";

  // Stores preference window index per app, to bring into focus when clicking the app icon when there is open windows
  // NOTE: Each number represents the index into the group of windows NOT the window ids themselves
  let focusPreference: number[] = [-1, -1, -1, -1, -1];

  let root: HTMLElement = $state();

  const windows: OpenWindow[] = _windows;
  const applications: Application[] = _applications;

  function hideMenu(type: WindowType) {
    const el = document.getElementById(`context-menu-for-${type}`);
    if (el !== null) {
      el.blur();
    }
  }

  function showAll(type: WindowType) {
    windows
      .filter((win) => win.type == type)
      .filter(({ state: { show }}) => !show)
      .forEach(({ id }) => lib.showWindow(id))
    hideMenu(type);
  }

  function hideAll(type: WindowType) {
    windows
      .filter((win) => win.type == type)
      .forEach(({ id }) => lib.hideWindow(id))
    hideMenu(type);
  }

  function closeAll(type: WindowType) {
    windows
      .filter((win) => win.type == type)
      .forEach(({ id }) => lib.closeWindow(id))
    hideMenu(type);
  }

  function newInstance(type: WindowType, app: Application) {
    app.create();
    hideMenu(type);
  }

  let forwardKeydown = $state({});
  function onContextMenuKey(type: WindowType, ev: Event) {
    ev.preventDefault(); // do not queue keystroke to future input.
    forwardKeydown[type](ev);
  }

  function focusLost(el: HTMLElement) {
    if (!el.classList.contains("menu-hidden")) {
      el.classList.add("menu-hidden");
    }
  }
</script>

<div class="wrapper">
  <div class="tasks" bind:this={root}>
    {#each applications as app, type}
      {#if app.alwaysShow || app.instances !== 0}
        <div>
          <!--
            This is really annoying! We are using _tabindex_ so we can handle focusout of the element.
            The issue is that the click handler on the child of the focused element will raise the focusout
            event on parent on mouse down, which if you would then hide the element, the mouse up event will
            be discarded - hence discarding the click event on the child. The work around is to only hide
            if the focusout target is not a child, and also additionally hide when the click event bubbles up
            to the parent.
          -->
          <div role="button" tabindex="-1" id={`context-menu-for-${type}`} onkeydown={(ev) => onContextMenuKey(type, ev)} class="menu menu-hidden"
            onclick={(ev) => focusLost(ev.currentTarget as HTMLElement)}
            onfocusout={(ev) => {
              const self = ev.currentTarget as HTMLElement;
              if (ev.relatedTarget === null || !self.contains(ev.relatedTarget as Node)) {
                focusLost(self);
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
              // Reset everbody else's preference indices
              // this allows the user to swap back and forth between 2 preferrred applications
              for (let i = 0; i < focusPreference.length; i++) {
                if (i !== type && focusPreference[i] !== -1) {
                  focusPreference[i] = -1;
                }
              }
              let index = focusPreference[type];
              const instances: OpenWindow[] = Array.from(lib.instances(type));
              instances.sort((a, b) => lib.getLayer(a.id) - lib.getLayer(b.id));
              if (index === -1) {
                index = instances.length - 1;
              }
              index = Math.max(0, Math.min(instances.length - 1, index)); // make absolutely sure we index in range - user could have closed a window since
              lib.focusWindow(instances[index].id);
              focusPreference[type] = Math.max(0, index - 1);
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

<!-- If the user clicks anything other than the taskbar, we need to stop
     cycling and just preserve the last focused items  -->
<svelte:window onclick={(ev) => {
  // TODO is it OK to just cast to Node here?
  if (!root.contains(ev.target as Node)) {
    for (let i = 0; i < focusPreference.length; i++) {
      focusPreference[i] = -1;
    }
  }
}}/>

<style>
  .wrapper {
    display: flex;
    flex-direction: row;
    justify-content: center;
  }

  .menu {
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
