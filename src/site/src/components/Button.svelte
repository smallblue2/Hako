<script>
  let { id = "0", color = "surface", children } = $props();
</script>

<button data-uid={id} class={`btn-${color} btn remove-button-styles`}>
  {@render children?.()}
</button>

<style>
  .btn {
    padding: 0.4rem;
    border-radius: 0.4rem;
  }
  .btn-primary {
    color: var(--md-sys-color-primary-on-container);
    background-color: var(--md-sys-color-primary-container);
    transition: color 150ms ease;
    transition: background-color 150ms ease;
  }
  .btn-primary:hover {
    color: color-mix(in srgb, var(--md-sys-color-primary-on-container), black 10%);
    background-color: color-mix(in srgb, var(--md-sys-color-primary-container), black 10%);
  }
  .btn-secondary {
    color: var(--md-sys-color-secondary-on-container);
    background-color: var(--md-sys-color-secondary-container);
    transition: color 150ms ease;
    transition: background-color 150ms ease;
  }
  .btn-secondary:hover {
    color: color-mix(in srgb, var(--md-sys-color-secondary-on-container), black 10%);
    background-color: color-mix(in srgb, var(--md-sys-color-secondary-container), black 10%);
  }
  .btn-tertiary {
    color: var(--md-sys-color-tertiary-on-container);
    background-color: var(--md-sys-color-tertiary-container);
    transition: color 150ms ease;
    transition: background-color 150ms ease;
  }
  .btn-tertiary:hover {
    color: color-mix(in srgb, var(--md-sys-color-tertiary-on-container), black 10%);
    background-color: color-mix(in srgb, var(--md-sys-color-tertiary-container), black 10%);
  }
  .btn-error {
    color: var(--md-sys-color-error-on-container);
    background-color: var(--md-sys-color-error-container);
    transition: color 150ms ease;
    transition: background-color 150ms ease;
  }
  .btn-error:hover {
    color: color-mix(in srgb, var(--md-sys-color-error-on-container), black 10%);
    background-color: color-mix(in srgb, var(--md-sys-color-error-container), black 10%);
  }
  .btn-surface {
    color: var(--md-sys-color-surface-on-container);
    background-color: var(--md-sys-color-surface-container);
    transition: color 150ms ease;
    transition: background-color 150ms ease;
  }
  .btn-surface:hover {
    color: color-mix(in srgb, var(--md-sys-color-surface-on-container), black 10%);
    background-color: color-mix(in srgb, var(--md-sys-color-surface-container), black 10%);
  }
</style>
