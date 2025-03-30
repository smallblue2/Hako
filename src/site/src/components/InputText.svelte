<script>
  /** @type {HTMLDialogElement | undefined} */
  let root = $state();
  /** @type {HTMLFormElement | undefined} */
  let form = $state();

  let { open = $bindable() } = $props();

  let text = $state("");
  let title = $state("");

  open = (title_, text_) => {
    text = text_;
    title = title_;
    root.showModal();
    return new Promise((res, _rej) => {
      form.addEventListener("submit", (ev) => {
        res(ev.target[0].value);
      }, { once: true })
    });
  };
</script>

<dialog bind:this={root}>
  <h3>{title}</h3>
  <form bind:this={form} method="dialog">
    <input type="text" value={text}>
  </form>
</dialog>
