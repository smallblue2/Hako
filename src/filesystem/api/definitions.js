// TODO: Confirm all of these are correct

// Found in my fcntl.h file - not sure if correct
export const O_CREAT = 0o0100;
export const O_ACCMODE = 0o0003;
export const O_RDONLY = 0o00;
export const O_WRONLY = 0o01;
export const O_RDWR = 0o02;
export const O_EXCL = 0o0200;	/* Not fcntl.  */
export const O_NOCTTY = 0o0400;	/* Not fcntl.  */
export const O_TRUNC = 0o01000;	/* Not fcntl.  */
export const O_APPEND = 0o02000;
export const O_NONBLOCK = 0o04000;
export const O_NDELAY = O_NONBLOCK;
export const O_SYNC = 0o04010000;
export const O_FSYNC = O_SYNC;
export const O_ASYNC = 0o020000;
export const __O_LARGEFILE = 0o0100000;
export const __O_DIRECTORY = 0o0200000;
export const __O_NOFOLLOW = 0o0400000;
export const __O_CLOEXEC = 0o02000000;
export const __O_DIRECT = 0o040000;
export const __O_NOATIME = 0o01000000;
export const __O_PATH = 0o010000000;
export const __O_DSYNC = 0o010000;
export const __O_TMPFILE = (0o020000000 | __O_DIRECTORY);

/* Values for lseek 'whence' */
export const SEEK_SET = 0;
export const SEEK_CUR = 1;
export const SEEK_END = 2;

/* Values for the second argument to access.
   These may be OR'd together.  */
export const R_OK	= 4;		/* Test for read permission.  */
export const W_OK	= 2;		/* Test for write permission.  */
export const X_OK	= 1;		/* Test for execute permission.  */
export const F_OK	= 0;		/* Test for existence.  */

export function errnoToString(errno) {
   switch (errno) {
      case 44:
         return "File doesn't exist!";
      default:
         return `Unkown error: ${errno}`;
   }
}
