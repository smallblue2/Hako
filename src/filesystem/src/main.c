#include "main.h"
#include <emscripten.h>
#include <errno.h>
#include <fcntl.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>

// Explicitly forces a filesystem synchronisation.
// Likely not needed if the IDBFS filesystem is mounted with `autoPersist`
// option set to TRUE
void file__syncFS() {
#ifdef __EMSCRIPTEN__
  EM_ASM({
    // Force an initial sync - despite `autoPersist` flag
    FS.syncfs(
        true, function(err) {
          if (err) {
            console.error("[JS] Error during sync:", err);
          } else {
            console.log("[JS] Sync completed succesfully!");
          }
        });
  });
#endif

  return;
}

// Mounts filesystem, creating structure if required.
void file__initialiseFS() {
  printf("[C] Starting up persistent filesystem at '%s'...\n",
         PERSISTENT_ROOT_NAME);

#ifdef __EMSCRIPTEN__
  EM_ASM(
      {
        let persistentRoot = UTF8ToString($0);
        let check = FS.analyzePath(persistentRoot, false);
        if (check.exists) {
          console.log("[JS]", persistentRoot, "already exists!");
          console.log("[JS] Directory info:", check);
        } else {
          console.log("[JS] Creating directory:", persistentRoot);
          FS.mkdir(persistentRoot);
        }

        // Mount IDBFS
        console.log("[JS] Mounting IDBFS at", persistentRoot);
        try {
          FS.mount(IDBFS, {autoPersist : true}, persistentRoot);
        } catch (err) {
          console.error("[JS] Failed to mount filesystem:", err);
        }
      },
      PERSISTENT_ROOT_NAME);
#endif

  file__syncFS(); // Not sure if needed due to autoPersist: true

  return;
}

int file__open(const char *path, int flags, Error *err) {
  int fd = open(path, flags);

  if (fd < 0) {
    // has failed (sad) :'(
    *err = errno;
    return -1;
  }

  *err = 0;
  return fd;
}

void file__close(int fd, Error *err) {
  if (close(fd) < 0) {
    *err = errno;
    return;
  }
  *err = 0;
  return;
}

void file__write(int fd, const char *content, Error *err) {
  int contentLength = strlen(content);
  int written = write(fd, content, contentLength);
  if (written < 0) {
    *err = errno;
    return;
  }
  *err = 0;
  return;
}

// Reads up to `amt`, returning whatever it was able to read
void file__read(int fd, int amt, ReadResult *rr, Error *err) {
  rr->size = -1;
  rr->data = NULL;

  char *buf = calloc(amt, sizeof(char));
  if (!buf) {
    *err = errno;
    return;
  }

  int amount_read = read(fd, buf, amt);
  if (amount_read < 0) {
    *err = errno;
    return;
  }

  // WARNING: MUST free in WASM!
  rr->data = buf;
  rr->size = amount_read;

  *err = 0;
  return;
}

// Reads the entirety of a files contents
void file__read_all(int fd, ReadResult *rr, Error *err) {
  rr->data = NULL;
  rr->size = -1;

  ssize_t buf_size = BUFSIZ;
  // Allocate buffer on heap
  char *buf = malloc(buf_size * sizeof(char));
  // Initialise or pointer to the start of the buffer
  char *ptr = buf;

  ssize_t bytes_read = 0;

  // Keep reading as many bytes as possible, filling to the end of the buffer
  // ((bug + buf_size) - ptr).
  while ((bytes_read = read(fd, ptr, (buf + buf_size) - ptr)) > 0) {
    // Move the pointer forward
    ptr += bytes_read;

    ssize_t avail = (buf + buf_size) - ptr;
    // Check if the remaining space is less than the buffer size (we can't
    // request a full buffer for the next read)
    if (avail < BUFSIZ) {
      // Our minimum read request is of BUFSIZ

      // We need to store the offset of the ptr from buf
      // as the realloc will have a new address (most of the time)
      ssize_t offset = ptr - buf;

      // Double the buffer size
      void *blk = realloc(buf, buf_size * 2);
      if (blk == NULL) {
        // realloc failed
        *err = errno;
        free(buf);
        return;
      }
      // Save the resized buffer as our new buffer
      buf = blk;
      // Take into account our new buffer size
      buf_size *= 2;

      // Update ptr to correct location in new buffer
      ptr = (buf + offset);
    }
  }

  // bytes_read == 0 means EOF, if this is false, there was an error in a read
  if (bytes_read != 0) {
    // If it is not EOF
    *err = errno;
    free(buf);
    return;
  }

  // NOTE: could technically reallocate here down to the exact size needed
  // but that can also be done by the caller if it is an issue

  // Calculate the total number of bytes read
  rr->size = (ptr - buf);

  // Allocate enough space for the files contents into our ReadResult struct
  rr->data = malloc(rr->size * sizeof(char));
  if (!rr->data) {
    *err = errno;
    free(buf);
    return;
  }

  // copy the buffer into our String output struct
  memcpy(rr->data, buf, rr->size);

  // free the buffer
  free(buf);

  // No error
  *err = 0;
  return;
}

// Shifts the file offset by 'amt'
void file__shift(int fd, int amt, Error *err) {
  int moved_bytes = lseek(fd, amt, SEEK_CUR);
  if (moved_bytes < 0) {
    *err = errno;
    return;
  }

  *err = 0;
  return;
}

// Places the file offset to `pos`
void file__goto(int fd, int pos, Error *err) {
  int moved_bytes = lseek(fd, pos, SEEK_SET);
  if (moved_bytes < 0) {
    *err = errno;
    return;
  }
  *err = 0;
  return;
}

// Unlinks a node
//
// TODO: Test on directories, if it doesnt work - likely change to
// `file__removeFile`
void file__remove(const char *path, Error *err) {
  int error = unlink(path);
  if (error < 0) {
    *err = errno;
    return;
  }
  *err = 0;
  return;
}

void file__move(const char *old_path, const char *new_path, Error *err) {
  int error = rename(old_path, new_path);
  if (error < 0) {
    *err = errno;
    return;
  }
  *err = 0;
  return;
}

void file__make_dir(const char *path, Error *err) {
  int error = mkdir(path, 0755);
  if (error < 0) {
    *err = errno;
    return;
  }
  *err = 0;
  return;
}

void file__remove_dir(const char *path, Error *err) {
  int error = rmdir(path);
  if (error < 0) {
    *err = errno;
    return;
  }
  *err = 0;
  return;
}

void file__read_dir(const char *path, Entry *entry, int *err) {
  // Ensure previous entry name is freed before overwriting
  // (This is performed in JS API, but just to be safe!)
  if (entry->name) {
    free(entry->name);
    entry->name = NULL;
  }

  // If this is the first call (dirp == NULL), open the directory
  if (entry->dirp == NULL) {
    entry->dirp = opendir(path);
    if (entry->dirp == NULL) {
      *err = errno;
      return;
    }
  }

  // Read the next entry
  errno = 0; // readdir signals an error when at End of Directory, but doesn't
             // set errno
  struct dirent *ep = readdir(entry->dirp);

  if (ep == NULL) {
    // Errno still being 0 signals end of directory
    if (errno == 0) {
      entry->isEnd = 1;
      closedir(entry->dirp);
      entry->dirp =
          NULL; // Ensure `dirp` is reset to avoid reuse of closed pointer
      return;
    }
    *err = errno;
    return;
  }

  // Store the entry name
  entry->name = strdup(ep->d_name);
  if (entry->name == NULL) {
    closedir(entry->dirp);
    entry->dirp = NULL; // Prevent reuse of closed pointer
    *err = errno;
    return;
  }

  entry->name_len = strlen(entry->name);
  entry->isEnd = 0;
  *err = 0;
  return;
}

void file__stat(const char *name, StatResult *sr, Error *err) {
  struct stat file_stat;
  if (stat(name, &file_stat) < 0) {
    *err = errno;
    return;
  }

  sr->size = file_stat.st_size;
  sr->blocks = file_stat.st_blocks;
  sr->blocksize = file_stat.st_blksize;
  sr->ino = file_stat.st_ino;
  sr->perm = file_stat.st_mode & 0700; // bitmask user perms
  sr->atime.sec = (int)file_stat.st_atim.tv_sec;
  sr->atime.nsec = (int)file_stat.st_atim.tv_nsec;
  sr->mtime.sec = (int)file_stat.st_mtim.tv_sec;
  sr->mtime.nsec = (int)file_stat.st_mtim.tv_nsec;
  sr->ctime.sec = (int)file_stat.st_ctim.tv_sec;
  sr->ctime.nsec = (int)file_stat.st_ctim.tv_nsec;

  *err = 0;
  return;
}

void file__fdstat(int fd, StatResult *sr, Error *err) {
  struct stat file_stat;
  if (fstat(fd, &file_stat) < 0) {
    *err = errno;
    return;
  }

  sr->size = file_stat.st_size;
  sr->blocks = file_stat.st_blocks;
  sr->blocksize = file_stat.st_blksize;
  sr->ino = file_stat.st_ino;
  sr->perm = file_stat.st_mode & 0700; // bitmask user perms
  sr->atime.sec = (int)file_stat.st_atim.tv_sec;
  sr->atime.nsec = (int)file_stat.st_atim.tv_nsec;
  sr->mtime.sec = (int)file_stat.st_mtim.tv_sec;
  sr->mtime.nsec = (int)file_stat.st_mtim.tv_nsec;
  sr->ctime.sec = (int)file_stat.st_ctim.tv_sec;
  sr->ctime.nsec = (int)file_stat.st_ctim.tv_nsec;

  *err = 0;
  return;
}

void file__change_dir(const char *path, Error *err) {
  if (chdir(path) < 0) {
    *err = errno;
    return;
  }

  *err = 0;
  return;
}

// Changes permissions (only for user - single user OS, 0[use][ignore][ignore])
void file__permit(const char *path, int flags, Error *err) {
  // No permissions check here - user should be allowed to modify all file permissions
  // TODO: Figure out how to modify 
  if (chmod(path, flags) < 0) {
    *err = errno;
    return;
  }

  *err = 0;
  return;
}
// typedef struct {
//   int sec; // 4
//   int nsec; // 4
// } Time; // 8 bytes

// typedef struct { // 48 bytes
//   int size; // 4b
//   int blocks;
//   int blocksize;
//   int ino;
//   int perm; // permissions (01 Read, 010 Write) 20 bytes
//   Time atime;
//   Time mtime;
//   Time ctime; // 24 bytes
// } StatResult; // 44 bytes
