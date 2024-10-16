<script>
  import JoinRoom from './components/JoinRoom.svelte';
  import Room from './components/Room.svelte';
  import { roomId } from './store.js';

  let currentRoomId = '';

  roomId.subscribe(v => {
    console.log(v);
    currentRoomId = v;
  })
</script>

{#if currentRoomId === ''}
  <JoinRoom/>
{:else}
  <Room currentRoomId={currentRoomId}/>
{/if}
