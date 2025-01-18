<script>
  let { classList } = $props();
  let classes = classList.join(" ");
</script>

<div class={`${classes} wrapper`}>
  <div class="tasks">
    <embed class="placeholder" src="/placeholder.svg?url">
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
    background-color:color-mix(in srgb, var(--md-sys-color-secondary-container) 90%, transparent);
  }

  .placeholder {
    width: 2.7rem;
    height: 2.7rem;
  }
</style>
