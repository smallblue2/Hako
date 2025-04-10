if (!ENVIRONMENT_IS_NODE) {
  const syncfsOld = IDBFS.syncfs;
  const inotifyChannel = new BroadcastChannel("inotify");

  IDBFS.syncfs = (mount, populate, callback) => {
    inotifyChannel.postMessage({});
    return syncfsOld(mount, populate, callback);
  }
}
