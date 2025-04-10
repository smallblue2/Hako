<script>
  let { keydown = $bindable(), items } = $props();
  let keymap = $derived.by(() => {
    let km = [];
    for (const item of items) {
      if (item.shortcut !== undefined) {
        km[item.shortcut] = item.onclick;
      }
    }
    return km;
  });
  keydown = async (ev) => {
    return ev.key in keymap && await keymap[ev.key]()
  }
</script>

<menu class="contextmenu">
  {#each items as item}
    <li class="menu-item-wrapper">
      <div class={`menu-item  ${item.destructive ? "destructive" : ""}`} onclick={item.onclick}>
        <div>{item.name}</div>
        {#if item.shortcut !== undefined}
          <div class="shortcut">⌘ {item.shortcut.toUpperCase()}</div>
        {/if}
      </div>
    </li>
  {/each}
</menu>

<style>
  .contextmenu {
    margin: 0;
    padding: 0.4rem;
    border-radius: 0.4rem;
    list-style: none;
    color: var(--md-sys-color-on-surface);
    background-color: var(--md-sys-color-surface-container-high);
    outline: 1px solid var(--md-sys-color-outline-variant);
  }

  .menu-item {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    gap: 1rem;
    text-align: left;
    border-radius: 0.2rem;
    padding-left: 0.6rem;
    padding-right: 0.6rem;
    padding-top: 0.3rem;
    padding-bottom: 0.3rem;
    user-select: none;
    transition: color 150ms ease;
    transition: background-color 150ms ease;
  }

  .menu-item:hover {
    background-color: var(--md-sys-color-surface-container-low);
  }

  .destructive:hover {
    background-color: var(--md-sys-color-error-container) !important;
    color: var(--md-sys-color-on-error-container) !important;
  }
   
  .destrucive:hover > .shortcut {
    color: var(--md-sys-color-on-error) !important;
  }

  .shortcut {
    color: var(--md-sys-color-outline);
  }
</style>
