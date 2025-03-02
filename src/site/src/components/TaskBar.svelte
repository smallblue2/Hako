<script>
  import * as lib from "$lib/windows.svelte.js";
  import { applications, _windows } from "$lib/windows.svelte.js";

</script>

<div class="wrapper">
  <div class="tasks">
    {#each applications as app}
      {#if app.alwaysShow || app.instances !== 0}
        <button title={app.name} class={`remove-button-styles application ${app.instances !== 0 ? app.instances === 1 ? "application-one-instance" : "application-many-instances" : ""}`} onclick={() => {
          if (app.instances === 0 && app.create !== null) {
            app.create();
          } else {
          }
        }}>
          {@html app.icon}
        </button>
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

  .remove-button-styles {
    background: none;
    color: inherit;
    border: none;
    padding: 0;
    font: inherit;
    cursor: default;
    outline: inherit;
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
