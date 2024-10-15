<script>
  import MainPage from './components/MainPage.svelte';
  import RoomPage from './components/RoomPage.svelte';

  let currentPage = 'main';
  let currentRoomId = '';

  function handleJoinRoom(roomId) {
    if (roomId) {
      currentRoomId = roomId;
      currentPage = 'room';
    }
  }

  function handleCreateRoom() {
    // Random room id given
    currentRoomId = Math.random().toString(36).substr(2, 8);
    currentPage = 'room';
  }

  function leaveRoom() {
    currentRoomId = '';
    currentPage = 'main';
  }
</script>

{#if currentPage === 'main'}
  <MainPage joinRoom={handleJoinRoom} createRoom={handleCreateRoom} />
{:else if currentPage === 'room'}
  <RoomPage roomId={currentRoomId} leaveRoom={leaveRoom}/>
{/if}
