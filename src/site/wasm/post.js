PTY_waitForReadableWithCallback = (callback) => {
  if (PTY_pollTimeout === 0) {
      return callback(PTY.readable ? 0 /* ready */ : 2 /* timeout */);
  }
  let handlerReadable, handlerSignal, timeoutId;
  new Promise((resolve) => {
      handlerReadable = PTY.onReadable(() => resolve(0 /* ready */));

      // We need to stop select(2) when a signal is caught.
      //
      // TODO: In fact, it should be stopped "when a signal handler is called," not "a the signal is received."
      // If the signal handler is set as SIG_IGN, select(2) should not be stopped.
      handlerSignal = PTY.onSignal(
        (sig) => {
          if (PTY_signalNameToCode[sig] != 28 /* SIGWINCH */) {
            resolve(1 /* interrupted */)
          }
        }
      );

      if (PTY_pollTimeout >= 0) {
          // if negative timeout, don't stop early (in poll-like functions it means infinite wait),
          // otherwise wait specified number of ms.
          timeoutId = setTimeout(resolve, PTY_pollTimeout, 2 /* timeout */);
      }
  })
  .then(type => {
      handlerReadable.dispose();
      handlerSignal.dispose();
      // note: it's fine to call even with undefined timeoutId
      clearTimeout(timeoutId);
      callback(type);
  });
};
