<script>
  import Desktop from "../components/Desktop.svelte";
</script>

<Desktop></Desktop>

<div id="event-overlay"></div>

<style>
:global(html) {
  height: 100%;
}

:global(body) {
  margin: 0;
  padding: 0;
  position: fixed;
  top: 0; right: 0; bottom: 0; left: 0;
  overflow: hidden;
}

:global(#event-overlay) {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  display: none;
  z-index: 1000;
}
</style>
