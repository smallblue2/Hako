// _fd_read = (fd, iov, iovcnt, pnum) => PTY_handleSleep((wakeUp) => {
//   let result = xterm_pty_old_fd_read(fd, iov, iovcnt, pnum);
//
//   // Did this call return our variant of EAGAIN?
//     // If so, that means it called into the PTY and the buffer was empty.
//     if (result === 1006) {
//       // Wait for the PTY to become readable and try again.
//         PTY_waitForReadable((type) => {
//           switch (type) {
//             case 0: { /* ready */
//               const ret = xterm_pty_old_fd_read(fd, iov, iovcnt, pnum);
//               if (ret == 1006) {
//                 HEAPU32[((pnum)>>2)] = 0;
//                 wakeUp(0);
//               } else {
//                 wakeUp(ret);
//               }
//               break;
//             }
//             case 1: /* interrupted */
//                 wakeUp(27);
//               break;
//             case 2: /* timeout */
//                 wakeUp(0);
//               break;
//           }
//         });
//     } else {
//       wakeUp(result);
//     }
// });
