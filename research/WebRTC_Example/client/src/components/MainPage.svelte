<script>
  export let joinRoom;
  export let createRoom;
  let roomId = '';
</script>

<div>
  <h1>WebRTC Demo</h1>

  <div class="input-container">
    <input bind:value={roomId} placeholder="Enter Room ID" />
    <button class="join-btn" on:click={() => joinRoom(roomId)}>Join Room</button>
  </div>

  <button class="create-btn" on:click={createRoom}>Create Room</button>
</div>

<style>
  .input-container {
    margin-bottom: 20px;
  }
  
  input {
    padding: 5px;
    margin-right: 10px;
    border-radius: 10px;
    border: 1px solid #ddd;
  }
  
  .join-btn, .create-btn {
    padding: 10px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
  }

  .join-btn {
    background-color: #a3e0a3;
  }

  .create-btn {
    background-color: #b2d9f7;
  }
</style>
