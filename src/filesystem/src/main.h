#ifndef MAIN_H
#define MAIN_H

#include <dirent.h>
#include <fcntl.h>

#define PERSISTENT_ROOT_NAME "/persistent"
#define BUFSIZ 1024

// ================= Errors=================
// Memory Isse
#define E_MEM 1

typedef int Error;

typedef struct __attribute__((packed)) {
  char *name; // To dirent
  int len;
  DIR *dirp;
} Entry;

typedef struct __attribute__((packed)) {
  char *data;
  int size;
} ReadResult;

int Entry__name();
int Entry__len();
int Entry__dirp();

int ReadResult__data();
int ReadResult__size();

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
void file__read_dir(const char *path, Entry *entry,
                    Error *err); // Keep calling, state kept in DIR*
void file__stat(const char *path, ReadResult *rr, Error *err);
void file__fstat(int fd, ReadResult *rr, Error *err);
void file__change_dir(char *path);
void file__permit(const char *path, int flags);

#endif
