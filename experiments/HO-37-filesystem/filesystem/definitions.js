import { Filesystem } from './api.js';

// TODO: Confirm all of these are correct

// Found in my fcntl.h file - not sure if correct
Filesystem.O_CREAT = 0o0100;
Filesystem.O_ACCMODE = 0o0003;
Filesystem.O_RDONLY = 0o00;
Filesystem.O_WRONLY = 0o01;
Filesystem.O_RDWR = 0o02;
Filesystem.O_EXCL = 0o0200;	/* Not fcntl.  */
Filesystem.O_NOCTTY = 0o0400;	/* Not fcntl.  */
Filesystem.O_TRUNC = 0o01000;	/* Not fcntl.  */
Filesystem.O_APPEND = 0o02000;
Filesystem.O_NONBLOCK = 0o04000;
Filesystem.O_NDELAY = Filesystem.O_NONBLOCK;
Filesystem.O_SYNC = 0o04010000;
Filesystem.O_FSYNC = Filesystem.O_SYNC;
Filesystem.O_ASYNC = 0o020000;
Filesystem.__O_LARGEFILE = 0o0100000;
Filesystem.__O_DIRECTORY = 0o0200000;
Filesystem.__O_NOFOLLOW = 0o0400000;
Filesystem.__O_CLOEXEC = 0o02000000;
Filesystem.__O_DIRECT = 0o040000;
Filesystem.__O_NOATIME = 0o01000000;
Filesystem.__O_PATH = 0o010000000;
Filesystem.__O_DSYNC = 0o010000;
Filesystem.__O_TMPFILE = (0o020000000 | Filesystem.__O_DIRECTORY);

/* Values for lseek 'whence' */
Filesystem.SEEK_SET = 0;
Filesystem.SEEK_CUR = 1;
Filesystem.SEEK_END = 2;

/* Values for the second argument to access.
   These may be OR'd together.  */
Filesystem.R_OK	= 4;		/* Test for read permission.  */
Filesystem.W_OK	= 2;		/* Test for write permission.  */
Filesystem.X_OK	= 1;		/* Test for execute permission.  */
Filesystem.F_OK	= 0;		/* Test for existence.  */


console.log("Definitions loaded.");
