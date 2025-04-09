<script>
  import Popup from "./Popup.svelte";

  /** @type {HTMLDialogElement | undefined} */
  let dialog = $state();
  /** @type {HTMLFormElement | undefined} */
  let form = $state();

  let { open = $bindable() } = $props();

  let text = $state("");
  let title = $state("");

  open = (title_, text_) => {
    text = text_;
    title = title_;
    openPopup();
    return new Promise((res, rej) => {
      form.addEventListener("submit", (ev) => {
        res(ev.target[0].value);
      }, { once: true })
      dialog.addEventListener("close", (ev) => {
        rej(text);
      }, { once: true });
    });
  };

  let openPopup = $state();
</script>

<Popup bind:dialog bind:open={openPopup}>
  <h3 class="title">{title}</h3>
  <form bind:this={form} method="dialog">
    <input class="input" type="text" bind:value={text} formmethod="dialog">
  </form>
</Popup>

<style>
  .title {
    margin-top: 0;
    color: var(--md-sys-color-on-surface);
  }
  .input:focus {
    outline: none;
  }
</style>
