<script>
  import { roomId } from '../store.js';

  let roomIdBuffer = '';

  function setRoom() {
    roomId.set(roomIdBuffer);
  }

  function generateRandomHex(length) {
    let current = '';
    for (let i = 0; i < length; i++) {
      current += Math.floor(Math.random() * 16).toString(16);
    }
    return current;
  }

  function createRoom() {
    roomId.set(generateRandomHex(16));
  }
</script>

<div>
  <h1>WebRTC Demo</h1>

  <div class='input-div'>
    <input bind:value={roomIdBuffer} type="text" placeholder="Enter Room ID">
    <button class='join-btn' on:click={() => setRoom()}>Join Room</button>
  </div>

  <button class='create-btn' on:click={() => createRoom()}>Create Room</button>
</div>

<style>
  .input-div {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-between;
    margin: 20px;
  }

  .join-btn {
    background-color: #3C4841;
    color: #A7C080;
  }

  .join-btn:hover {
    background-color: #A7C080; 
    color: #3C4841;
    border-color: #000000;
  }

  .create-btn {
    background-color: #384B55;
    color: #7FBBB3;
  }

  .create-btn:hover {
    background-color: #7FBBB3; 
    color: #384B55;
    border-color: #000000;
  }
</style>
