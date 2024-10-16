<script>
  import { roomId } from '../store.js';

  export let currentRoomId;

  function leaveRoom() {
    roomId.set('');
  }
</script>

<div>
  <h1>Room: {currentRoomId}</h1>
  <div class='videos'>
    <video autoplay/>
    <video autoplay/>
  </div>
  <button class='leave-btn' on:click={() => leaveRoom()}>Leave Room<btn>
</div>

<style>
  .videos {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    width: 900px;
    margin-bottom: 20px;
  }

  video {
    width: 400px;
    height: 300px;
    border: 2px solid #D3C6AA;
  }

  .leave-btn {
    background-color: #4C3743;
    color: #E67E80;
  }

  .leave-btn:hover {
    background-color: #E67E80;
    color: #4C3743;
    border: #000;
  }
</style>
