<script lang="ts" module>
  export type OpenConfirmationFn = () => Promise<boolean>;
  export interface Props {
    open: OpenConfirmationFn,
    title: string,
    subtext: string,
    confirmLabel?: string,
    denyLabel?: string,
  }
</script>

<script lang="ts">
  import Popup, { type OpenPopupFn } from "./Popup.svelte";
  import Button from "./Button.svelte";
  let { open = $bindable(), title, subtext, confirmLabel = "accept", denyLabel = "reject" }: Props = $props();
  let openPopup: OpenPopupFn = $state();
  open = () => {
    openPopup();
    return new Promise((res, _rej) => {
      form.addEventListener("submit", (ev) => {
        res(ev.submitter.dataset.uid === "1");
      }, { once: true })
      dialog.addEventListener("close", (_ev) => {
        res(false);
      }, { once: true });
    });
  };
  let form: HTMLFormElement = $state();
  let dialog: HTMLDialogElement = $state();
</script>

<Popup bind:dialog bind:open={openPopup}>
  <h3 class="title">{title}</h3>
  <p class="subtext">{subtext}</p>
  <form bind:this={form} method="dialog">
    <div class="actions">
      <Button id="0" color="surface" formmethod="dialog">{denyLabel}</Button>
      <Button id="1" color="primary" formmethod="dialog">{confirmLabel}</Button>
    </div>
  </form>
</Popup>

<style>
  .title {
    margin-top: 0;
    color: var(--md-sys-color-on-surface);
  }
  .subtext {
    color: var(--md-sys-color-on-surface);
  }
  .actions {
    margin-left: auto;
  }
</style>
