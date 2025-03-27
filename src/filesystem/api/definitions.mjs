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
export const R_OK = 4;		/* Test for read permission.  */
export const W_OK = 2;		/* Test for write permission.  */
export const X_OK = 1;		/* Test for execute permission.  */
export const F_OK = 0;		/* Test for existence.  */

// See `filesystem/src/main.h` for error definitions
// This is due to emscripten using its own strange errno system
export function errnoToString(errno) {
  switch (errno) {
    case 1:
      return "File exists";
    case 2:
      return "No such file or directory";
    case 3:
      return "Operation not permitted";
    case 4:
      return "Bad file descriptor";
    case 5:
      return "Protected system file";
    case 6:
      return "Is a directory";
    case 7:
      return "Not a directory";
    case 8:
      return "I/O error";
    case 9:
      return "Invalid argument";
    case 10:
      return "Resource temporarily unavailable (EAGAIN)";
    default:
      return `Unkown error: ${errno}`;
  }
}
// #define	EPERM		 1	/* Operation not permitted */
// #define	ENOENT		 2	/* No such file or directory */
// #define	ESRCH		 3	/* No such process */
// #define	EINTR		 4	/* Interrupted system call */
// #define	EIO		 5	/* I/O error */
// #define	ENXIO		 6	/* No such device or address */
// #define	E2BIG		 7	/* Argument list too long */
// #define	ENOEXEC		 8	/* Exec format error */
// #define	EBADF		 9	/* Bad file number */
// #define	ECHILD		10	/* No child processes */
// #define	EAGAIN		11	/* Try again */
// #define	ENOMEM		12	/* Out of memory */
// #define	EACCES		13	/* Permission denied */
// #define	EFAULT		14	/* Bad address */
// #define	ENOTBLK		15	/* Block device required */
// #define	EBUSY		16	/* Device or resource busy */
// #define	EEXIST		17	/* File exists */
// #define	EXDEV		18	/* Cross-device link */
// #define	ENODEV		19	/* No such device */
// #define	ENOTDIR		20	/* Not a directory */
// #define	EISDIR		21	/* Is a directory */
// #define	EINVAL		22	/* Invalid argument */
// #define	ENFILE		23	/* File table overflow */
// #define	EMFILE		24	/* Too many open files */
// #define	ENOTTY		25	/* Not a typewriter */
// #define	ETXTBSY		26	/* Text file busy */
// #define	EFBIG		27	/* File too large */
// #define	ENOSPC		28	/* No space left on device */
// #define	ESPIPE		29	/* Illegal seek */
// #define	EROFS		30	/* Read-only file system */
// #define	EMLINK		31	/* Too many links */
// #define	EPIPE		32	/* Broken pipe */
// #define	EDOM		33	/* Math argument out of domain of func */
// #define	ERANGE		34	/* Math result not representable */
