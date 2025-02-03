#ifndef MAIN_H
#define MAIN_H

#include <dirent.h>
#include <fcntl.h>

#define PERSISTENT_ROOT_NAME "/persistent"

// For reading
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
#define E_ISDIR          6
#define E_NOTDIR         7
#define E_IOERROR        8
#define E_INVALID        9
#define E_AGAIN          10

typedef int Error;

typedef struct __attribute__((packed)) {
  int name_len; // 4 bytes
  char *name; // 4 bytes
  int isEnd; // 4 bytes (0 for false, 1 for true)
  DIR *dirp; // 4 bytes
} Entry; // 16 bytes

typedef struct __attribute__((packed)) {
  char *data; // 4 bytes
  int size;   // 4 bytes
} ReadResult;

typedef struct __attribute__((packed)) {
  int sec; // 4
  int nsec; // 4
} Time; // 8 bytes

typedef struct __attribute__((packed)) { // 48 bytes
  int size;
  int blocks;
  int blocksize;
  int ino;
  int perm; // permissions (01 Read, 001 Write, 0001 Execute) 20 bytes
  Time atime;
  Time mtime;
  Time ctime; // 24 bytes
} StatResult; // 44 bytes

void file__initialiseFS();
void file__syncFS();
int file__open(const char *path, int flags, Error *err);
void file__close(int fd, Error *err);
void file__write(int fd, const char *content, Error *err);
void file__read(int fd, int amt, ReadResult *rr, Error *err);
void file__read_all(int fd, ReadResult *rr, Error *err);
void file__shift(int fd, int amt, Error *err);
void file__goto(int fd, int pos, Error *err);
void file__remove(const char *path, Error *err);
void file__move(const char *old_path, const char *new_path, Error *err);
void file__make_dir(const char *path, Error *err);
void file__remove_dir(const char *path, Error *err);
void file__change_dir(const char *path, Error *err);
void file__read_dir(const char *path, Entry *entry,
                    Error *err); // Keep calling, state kept in DIR*
void file__stat(const char *path, StatResult *sr, Error *err);
void file__fdstat(int fd, StatResult *sr, Error *err);
void file__permit(const char *path, int flags, Error *err);

#endif
