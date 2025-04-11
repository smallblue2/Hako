<script lang="ts" module>
  import type { OpenPopupFn } from "./Popup.svelte";
  export type OpenFn = (title: string, text: string) => Promise<string>;
  export interface Props {
    open: OpenFn,
  }
</script>

<script lang="ts">
  import Popup from "./Popup.svelte";

  let form: HTMLFormElement = $state();
  let dialog: HTMLDialogElement = $state();

  let { open = $bindable() }: Props = $props();

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

  let openPopup: OpenPopupFn = $state();
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
