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
} Read_Result;

typedef struct __attribute__((packed)) {
  int len;
  char *data; // Will need to be freed!
} String;

int Entry__name();
int Entry__len();
int Entry__dirp();

int Read_Result__data();
int Read_Result__size();

void file__initialiseFS();
void file__syncFS();
int file__open(char *path, int flags, Error *err);
void file__close(int fd, Error *err);
void file__write(int fd, char *content, Error *err);
String file__read(int fd, int amt, Error *err);
String file__read_all(int fd, Error *err);
void file__shift(int fd, int amt, Error *err);
void file__goto(int fd, int pos, Error *err);
void file__remove(char *path, Error *err);
void file__move(char *old_path, char *new_path, Error *err);
void file__make_dir(char *path, Error *err);
void file__remove_dir(char *path, Error *err);
void file__read_dir(char *path, Entry *entry,
                    Error *err); // Keep calling, state kept in DIR*
void file__stat(char *path, Read_Result *rr, Error *err);
void file__fstat(int fd, Read_Result *rr, Error *err);
void file__change_dir(char *path);
void file__permit(char *path, int flags);

#endif
