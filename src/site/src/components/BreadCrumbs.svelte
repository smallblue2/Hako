<script>
  let { crumbs } = $props();
</script>

<div class="breadcrumbs">
  {#each crumbs as crumb, i}
    {#if i !== 0}
      <div class="divider">&gt;</div>
    {/if}
    <button class="btn remove-button-styles" onclick={() => crumb.onclick()}>{crumb.text}</button>
  {/each}
</div>

<style>
  .breadcrumbs {
    display: flex;
    flex-direction: row;
    background-color: var(--md-sys-color-background);
    padding: 0.3rem;
    user-select: none;
    align-items: center;
  }
  .divider {
    margin-left: 0.5rem;
    margin-right: 0.5rem;
  }
  .btn {
    border-radius: 0.3rem;
    padding: 0.2rem 0.4rem 0.2rem 0.4rem;
    background-color: var(--md-sys-color-tertiary);
    color: var(--md-sys-color-on-tertiary);
  }
  .btn:hover {
    color: color-mix(in srgb, var(--md-sys-color-on-tertiary), white 30%);
    background-color: color-mix(in srgb, var(--md-sys-color-tertiary), white 30%);
  }
</style>
