<script>
  import * as lib from "$lib/windows.svelte.js";
  import { applications, _windows } from "$lib/windows.svelte.js";

  /**
   * @param {number} type
   */
  function showAll(type) {
    _windows
      .filter((win) => win.type == type)
      .filter(({ state: { show }}) => !show)
      .forEach(({ id }) => lib.showWindow(id))
  }

  /**
   * @param {number} type
   */
  function hideAll(type) {
    _windows
      .filter((win) => win.type == type)
      .forEach(({ id }) => lib.hideWindow(id))
  }

  /**
   * @param {number} type
   */
  function closeAll(type) {
    _windows
      .filter((win) => win.type == type)
      .forEach(({ id }) => lib.closeWindow(id))
  }

</script>

<div class="wrapper">
  <div class="tasks">
    {#each applications as app, type}
      {#if app.alwaysShow || app.instances !== 0}
        <div>
          <menu tabindex="-1" onfocusout={(ev) => {
            ev.target.classList.toggle("menu-hidden");
          }} id={`context-menu-for-${type}`} class="menu menu-hidden">
            <li class="menu-item"><button class="remove-button-styles" onmousedown={() => closeAll(type)}>Close All</button></li>
            <li class="menu-item"><button class="remove-button-styles" onmousedown={() => hideAll(type)}>Hide All</button></li>
            <hr class="menu-divider"/>
            <li class="menu-item"><button class="remove-button-styles" onmousedown={() => showAll(type)}>Show All</button></li>
            {#if app.create !== null}
              <li class="menu-item"><button class="remove-button-styles" onmousedown={() => {
                app.create();
              }}>New Window</button></li>
            {/if}
          </menu>
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
  <!-- <div class="tasks"> -->
  <!--   {#each _windows as win} -->
  <!--     <button class="terminal-icon" onclick={() => { -->
  <!--       showWindow(win.id); -->
  <!--     }}> -->
  <!--       {@html TerminalIcon} -->
  <!--     </button> -->
  <!--   {/each} -->
  <!-- </div> -->
</div>

<style>
  .wrapper {
    display: flex;
    flex-direction: row;
    justify-content: center;
  }

  .menu {
    display: flex;
    background-color: white;
    flex-direction: column;
    list-style: none;
    transform: translate(calc((2.7rem * 0.5) - 50%), calc(-100% - 1rem));
    padding: 0.2rem;
    white-space: nowrap;
    background-color: var(--md-sys-color-surface);

    width: max-content;
    position: absolute;
    margin: 0;
    outline: var(--md-sys-color-outline) solid 1px;
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

  .menu-item {
    padding: 0.3rem 0.5rem 0.3rem 0.5rem;
    border-radius: 0.15rem;
  }

  .menu-item:hover {
    background-color: var(--md-sys-color-surface-dim);
  }

  .menu-divider {
    border-color: var(--md-sys-color-outline-variant);
    width: 90%;
  }

  .tasks {
    display: flex;
    flex-direction: row;
    justify-content: center;
    height: 100%;
    padding: 0.5rem;
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
