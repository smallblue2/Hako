<script>
  let { classList } = $props();
  let classes = classList.join(" ");

  import { _windows, getWindowByID } from "$lib/windows.svelte.js";
  import PlaceHolderIcon from "/src/placeholder.svg?raw";
</script>

<div class={`${classes} wrapper`}>
  <div class="tasks">
    {#each _windows as win}
      <button class="placeholder" onclick={() => {
        const el = document.getElementById(`window-${win.id}`);
        el.style.display = "block";
      }}>
        {@html PlaceHolderIcon}
      </button>
    {/each}
  </div>
</div>

<style>
  .wrapper {
    display: flex;
    flex-direction: column;
    justify-content: center;
    z-index: 999;
  }

  .tasks {
    display: flex;
    flex-direction: column;
    justify-content: center;
    height: 60%;
    background-color: color-mix(in srgb, var(--md-sys-color-secondary-container) 90%, transparent);
  }
 
  :global(.placeholder > svg) {
    width: 2.7rem;
    height: 2.7rem;
  }
</style>
