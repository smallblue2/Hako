#ifndef MAIN_H
#define MAIN_H

// ======================= Includes =======================

#include <dirent.h>
#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#endif
#include <errno.h>
#include <fcntl.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>
#include <limits.h>

// ======================= Filesystem Definitions =======================

// The root of our persistent filesystem
#define PERSISTENT_ROOT_NAME "/persistent"

// Buffer size for reading
#ifdef BUFSIZ
#undef BUFSIZ
#endif
#define BUFSIZ 1024

// If this bit is set on any files, they cannot be modified
// and are considered system files.
#define PROTECTED_BIT 0010

// Define our own errors as Emscripten seems to use its own strange system.
#define E_EXISTS 1
#define E_DOESNTEXIST 2
#define E_PERM 3
#define E_BADF 4
#define E_SYSFS 5
#define E_ISDIR 6
#define E_NOTDIR 7
#define E_IOERROR 8
#define E_INVALID 9
#define E_AGAIN 10

// ======================= Filesystem Structs =======================

// Output parameter on all filesystem API functions
//
// 0  if no error reported
// >0 if an error is reported
typedef int Error;

// Struct for iteravely reading directories.
//
// isEnd == 1 if we're at the end, 0 otherwise
typedef struct __attribute__((packed)) {
  int name_len; // 4 bytes
  char *name;   // 4 bytes WARNING: MUST BE FREED IN WASM/JS
  int isEnd;    // 4 bytes (0 for false, 1 for true)
  DIR *dirp;    // 4 bytes
} Entry;        // 16 bytes

// Output parameter struct, filled with file content when read
typedef struct __attribute__((packed)) {
  char *data; // 4 bytes WARNING: MUST BE FREED IN WASM/JS
  int size;   // 4 bytes
} ReadResult;

// Used in StatResult struct - matches POSIX `struct timespec`
typedef struct __attribute__((packed)) {
  int sec;  // 4
  int nsec; // 4
} Time;     // 8 bytes

// Output parameter struct, filled with a node's stat content
typedef struct __attribute__((packed)) { // 52 bytes
  int size;
  int blocks;
  int blocksize;
  int ino;
  int perm; // permissions (Only user: 01 Read, 001 Write, 0001 Execute) 20
            // bytes
  int type; // 0: file, 1: directory
  Time atime;
  Time mtime;
  Time ctime; // 24 bytes
} StatResult; 

// ======================= Filesystem API =======================

// Creates a `/persistent` directory and mounts persisting FS volume
void file__initialiseFS(void);

// Force syncing from and to indexeddb
void file__pushToPersist(void);
void file__pullFromPersist(void);

// Opens a file, only uses user flags, ignores any others provided
// INFO: Performs permission and existence checks
int file__open(const char *restrict path, int flags, Error *restrict err);

// Closes an open file
void file__close(int fd, Error *err);

// Writes to an open file
void file__write(int fd, const char *restrict content, Error *restrict err);

// Reads from an open file until newline or EOF
// WARNING: rr->data MUST be freed
void file__read_line(int fd, ReadResult *restrict rr, Error *err);

// Reads `amt` bytes in an open file
// WARNING: rr->data MUST be freed in WASM/JS
void file__read(int fd, int amt, ReadResult *restrict rr, Error *restrict err);

// Reads an open file in its entirety
// WARNING: rr->data MUST be freed in WASM/JS
void file__read_all(int fd, ReadResult *restrict rr, Error *restrict err);

// Shifts an open file's cursor by `amt` bytes
void file__shift(int fd, int amt, Error *err);

// Places an open file's cursor to `pos` (relative to 0)
void file__goto(int fd, int pos, Error *err);

// Removes a file
// INFO: Ensures `path` isn't a system node
void file__remove(const char *restrict path, Error *restrict err);

// Moves a node
// INFO: Ensures `old_path` and `new_path` are NOT system nodes
void file__move(const char *restrict old_path, const char *restrict new_path, Error *restrict err);

// Makes a directory
void file__make_dir(const char *restrict path, Error *restrict err);

// Removes a directory
void file__remove_dir(const char *restrict path, Error *restrict err);

// Changes the user's current directory
void file__change_dir(const char *restrict path, Error *restrict err);

// Reads a directory
// WARNING: entry->name MUST be freed in WASM/JS
void file__read_dir(const char *restrict path, Entry *restrict entry,
                    Error *restrict err); // Keep calling, state kept in DIR*

// Stats a node
void file__stat(const char *restrict path, StatResult *restrict sr, Error *restrict err);

// Stats an open file
void file__fdstat(int fd, StatResult *restrict sr, Error *restrict err);

// Changes permissions on a file
// INFO: Ensures `path` isn't a system node
void file__permit(const char *restrict path, int flags, Error *restrict err);

// Force file to be `length` size in bytes
void file__truncate(int fd, int length, Error *restrict err);

// Returns the current working directory
const char *file__cwd(Error *restrict err);


#endif
