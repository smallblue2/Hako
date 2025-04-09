<script>
  let { open = $bindable(), dialog = $bindable(), children } = $props();
  open = () => {
    dialog.showModal();
  };
</script>

<dialog bind:this={dialog} class="popup">
  {@render children?.()}
</dialog>

<style>
  .popup {
    padding: 1.5rem;
    color: var(--md-sys-color-on-surface);
    background-color: var(--md-sys-color-surface-container-high);
    border-radius: 0.4rem;
    outline: 1px solid var(--md-sys-color-outline-variant);
    border: none;
  }
  .popup::backdrop {
    opacity: 0.3;
    background-color: black;
  }
</style>
