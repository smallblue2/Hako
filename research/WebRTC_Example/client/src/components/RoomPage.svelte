<script>
  export let roomId;
  export let leaveRoom;
  let localStream;
  let remoteStream;
</script>

<div>
  <h2>Room: {roomId}</h2>

  <div class='videos'>
    <div class='video-container'>
      <video autoplay></video>
    </div>
    <div class='video-container'>
      <video autoplay></video>
    </div>
  </div>

  <button class='leave-btn' on:click={leaveRoom}>Leave</button>
</div>

<style>
  .videos {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .video-container {
    margin: 0 20px 0 20px;
    border: 2px solid #ddd;
    width: 600px;
    height: 350px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .leave-btn {
    padding: 10px;
    background-color: #b2d9f7;
    border-radius: 10px;
    border: none;
    cursor: pointer;
  }
</style>
