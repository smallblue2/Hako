<script>
  let { oncontextmenu = $bindable(), items } = $props();

  /** @type {HTMLDivElement | undefined} */
  let root = $state();
  let hidden = $state(true);

  oncontextmenu = (data, ev) => {
    ev.preventDefault();
    hidden = false;
    root.style.left = ev.clientX + "px";
    root.style.top = ev.clientY + "px";
  }

  function onPageClick() {
    hidden = true;
  }
</script>

<menu bind:this={root} class={`contextmenu ${hidden ? "hide-contextmenu" : ""}`}>
  {#each items as item}
    <li class="menu-item"><button class="remove-button-styles" onclick={item.onclick}>{item.name}</button></li>
  {/each}
</menu>

<svelte:window onclick={onPageClick}/>

<style>
  .menu-item {
    background-color: red;
  }
  .contextmenu {
    position: fixed;
    top: 0px;
    left: 0px;
  }
  :global(.hide-contextmenu) {
    visibility: hidden;
  }
</style>
