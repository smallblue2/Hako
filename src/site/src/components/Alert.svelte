<script>
  import Popup from "./Popup.svelte";
  import Button from "./Button.svelte";
  let { open = $bindable() } = $props();
  let openPopup = $state();
  let title = $state();
  let message = $state();
  open = (title_, message_) => {
    title = title_;
    message = message_;
    openPopup();
    return new Promise((res, rej) => {
      form.addEventListener("submit", (ev) => {
        res(ev.submitter.dataset.uid == 0);
      }, { once: true })
      dialog.addEventListener("cancel", (ev) => {
        res(false);
      }, { once: true });
    });
  };
  let form = $state();
  let dialog = $state();
</script>

<Popup bind:dialog bind:open={openPopup}>
  <h3 class="title">{title}</h3>
  <p>{message}</p>
  <form bind:this={form} method="dialog">
    <div class="actions">
      <Button id="0" color="secondary">Close</Button>
    </div>
  </form>
</Popup>

<style>
  .title {
    margin-top: 0;
    color: var(--md-sys-color-error);
  }
  .actions {
    margin-left: auto;
  }
</style>
