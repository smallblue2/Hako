#include "main.h"
#include <sys/stat.h>

// Emscripten uses its own errno convention when compiled which
// makes accurate error reporting convoluted - use our own.
int translate_errors(int err) {
  switch (err) {
  case EEXIST:
    return E_EXISTS;
  case ENOENT:
    return E_DOESNTEXIST;
  case EACCES:
    return E_PERM;
  case EROFS:
    return E_SYSFS;
  case EISDIR:
    return E_ISDIR;
  case ENOTDIR:
    return E_NOTDIR;
  case EIO:
    return E_IOERROR;
  case EINVAL:
    return E_INVALID;
  case EAGAIN:
    return E_AGAIN;
  default:
    printf("[C] Unknown error: %d: %s\n", err, strerror(err));
    return err;
  }
}

// Helper function for checking read perms based on stat
bool can_read(struct stat *node_stat) {
  return ((node_stat->st_mode & 0400) == 0400);
}

// Helper function for checking write perms based on stat
bool can_write(struct stat *node_stat) {
  return ((node_stat->st_mode & 0200) == 0200);
}

// Helper function for checking exec perms based on stat
bool can_exec(struct stat *node_stat) {
  return ((node_stat->st_mode & 0100) == 0100);
}

// Helper function for guarding system nodes based on stat
bool is_system_file(struct stat *node_stat) {
  return ((node_stat->st_mode & PROTECTED_BIT) == PROTECTED_BIT);
}

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

  // Permission checks
  struct stat st;
  bool file_exists = (stat(path, &st) == 0);

  bool wants_read =
      ((flags & O_RDONLY) == O_RDONLY) || ((flags & O_RDWR) == O_RDWR);
  bool wants_write =
      ((flags & O_WRONLY) == O_WRONLY) || ((flags & O_RDWR) == O_RDWR);

  if (file_exists) {
    // If the file already exists, and the user specified "create", fail
    if ((flags & O_CREAT) == O_CREAT) {
      *err = E_EXISTS;
      return -1;
    }
    // Read check
    if (wants_read && !can_read(&st)) {
      *err = translate_errors(EACCES);
      return -1;
    }
    // Write check
    if (wants_write && !can_write(&st)) {
      *err = translate_errors(EACCES);
      return -1;
    }
    // Trying to write to system file check
    if (wants_write && is_system_file(&st)) {
      *err = translate_errors(EROFS);
      return -1;
    }
  } else {
    // The file doesn't exist
    if ((flags & O_CREAT) == 0) {
      *err = translate_errors(ENOENT);
      return -1;
    }
  }

  // Finally open the file
  int fd = open(path, flags, 0700);

  if (fd < 0) {
    // has failed (sad) :'(
    *err = translate_errors(errno);
    return -1;
  }

  *err = 0;
  return fd;
}

void file__close(int fd, Error *err) {
  // NOTE: no perm checks, as they wouldn't make sense here
  if (close(fd) < 0) {
    *err = translate_errors(errno);
    return;
  }
  *err = 0;
  return;
}

void file__write(int fd, const char *content, Error *err) {
  // NOTE: no perm checks as the user already has the file descriptor


  int contentLength = strlen(content);
  printf("[C] Passed in fd: %d\n", fd);
  printf("[C] Passed in string: \"%s\" (%d)\n", content, contentLength);
  int written = write(fd, content, contentLength);
  printf("[C] Written returned => {%d}\n", written);
  if (written < 0) {
    *err = translate_errors(errno);
    return;
  }
  *err = 0;
  return;
}

// Reads up to `amt`, returning whatever it was able to read
void file__read(int fd, int amt, ReadResult *rr, Error *err) {
  // NOTE: No permission checks here - they already obtained fd

  rr->size = -1;
  rr->data = NULL;

  char *buf = calloc(amt, sizeof(char));
  if (!buf) {
    *err = translate_errors(errno);
    return;
  }

  int amount_read = read(fd, buf, amt);
  if (amount_read < 0) {
    *err = translate_errors(errno);
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
  // NOTE: No permission checks here - they already obtained fd

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
        *err = translate_errors(errno);
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
    *err = translate_errors(errno);
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
    *err = translate_errors(errno);
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
  // NOTE: No permission checks here - they already obtained fd

  int moved_bytes = lseek(fd, amt, SEEK_CUR);
  if (moved_bytes < 0) {
    *err = translate_errors(errno);
    return;
  }

  *err = 0;
  return;
}

// Places the file offset to `pos`
void file__goto(int fd, int pos, Error *err) {
  // NOTE: No permission checks here - they already obtained fd
  
  int moved_bytes = lseek(fd, pos, SEEK_SET);
  if (moved_bytes < 0) {
    *err = translate_errors(errno);
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
  // Permission checks
  struct stat st;
  bool file_exists = (stat(path, &st) == 0);

  if (!file_exists) {
    *err = translate_errors(EEXIST);
    return;
  }

  // If it's a system file, fail - user can't remove system files
  if (is_system_file(&st)) {
    *err = translate_errors(EROFS);
    return;
  }


  int error = unlink(path);
  if (error < 0) {
    *err = translate_errors(errno);
    return;
  }
  *err = 0;
  return;
}

void file__move(const char *old_path, const char *new_path, Error *err) {
  // Permission checks [OLD FILE]
  struct stat st;
  bool file_exists = (stat(old_path, &st) == 0);

  if (!file_exists) {
    *err = translate_errors(EEXIST);
    return;
  }

  // If it's a system file, fail - user can't move system files
  if (is_system_file(&st)) {
    *err = translate_errors(EROFS);
    return;
  }

  // Permission checks [NEW FILE]
  file_exists = (stat(new_path, &st) == 0);

  // If it's a system file, fail - user can't overwrite system files
  if (is_system_file(&st)) {
    *err = translate_errors(EROFS);
    return;
  }

  int error = rename(old_path, new_path);
  if (error < 0) {
    *err = translate_errors(errno);
    return;
  }
  *err = 0;
  return;
}

void file__make_dir(const char *path, Error *err) {
  // NOTE: No permission checks as we're not enforcing permissions
  //       on directories.

  int error = mkdir(path, 0755);
  if (error < 0) {
    *err = translate_errors(errno);
    return;
  }
  *err = 0;
  return;
}

void file__remove_dir(const char *path, Error *err) {
  // NOTE: No permission checks as we're not enforcing permissions
  //       on directories.

  int error = rmdir(path);
  if (error < 0) {
    *err = translate_errors(errno);
    return;
  }
  *err = 0;
  return;
}

void file__read_dir(const char *path, Entry *entry, int *err) {
  // NOTE: No permission checks as we're not enforcing permissions
  //       on directories.

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
      *err = translate_errors(errno);
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
    *err = translate_errors(errno);
    return;
  }

  // Store the entry name
  entry->name = strdup(ep->d_name);
  if (entry->name == NULL) {
    closedir(entry->dirp);
    entry->dirp = NULL; // Prevent reuse of closed pointer
    *err = translate_errors(errno);
    return;
  }

  entry->name_len = strlen(entry->name);
  entry->isEnd = 0;
  *err = 0;
  return;
}

void file__stat(const char *name, StatResult *sr, Error *err) {
  // NOTE: No permission checks, user can stat anything
  // This usually relies on the `x` of the parent directory,
  // but we're not implementing directory permissions

  struct stat file_stat;
  if (stat(name, &file_stat) < 0) {
    *err = translate_errors(errno);
    return;
  }

  sr->size = file_stat.st_size;
  sr->blocks = file_stat.st_blocks;
  sr->blocksize = file_stat.st_blksize;
  sr->ino = file_stat.st_ino;

  // If it's a directory, just report `rwx`
  if (S_ISDIR(file_stat.st_mode)) {
    sr->perm = 0700;
  } else {
    sr->perm = file_stat.st_mode & 0700; // bitmask user perms
  }

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
  // NOTE: No permission checks, user can stat anything
  // This usually relies on the `x` of the parent directory,
  // but we're not implementing directory permissions

  struct stat file_stat;
  if (fstat(fd, &file_stat) < 0) {
    *err = translate_errors(errno);
    return;
  }

  sr->size = file_stat.st_size;
  sr->blocks = file_stat.st_blocks;
  sr->blocksize = file_stat.st_blksize;
  sr->ino = file_stat.st_ino;

  // If it's a directory, just report `rwx`
  if (S_ISDIR(file_stat.st_mode)) {
    sr->perm = 0700;
  } else {
    sr->perm = file_stat.st_mode & 0700; // bitmask user perms
  }

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
  // NOTE: No permission checks here as directory permissions are ignored

  if (chdir(path) < 0) {
    *err = translate_errors(errno);
    return;
  }

  *err = 0;
  return;
}

// Changes FILE permissions (only for user - single user OS, 0[use][ignore][ignore])
void file__permit(const char *path, int flags, Error *err) {
  // permissions check
  struct stat st;
  bool file_exists = (stat(path, &st) == 0);

  if (!file_exists) {
    *err = translate_errors(EEXIST);
    return;
  }

  // If it's a directory, fail - as this does nothing in our system
  // and might even break it due to emscripten's emulation
  if (S_ISDIR(st.st_mode)) {
    *err = translate_errors(EISDIR);
    return;
  }

  // If it's a system file, fail
  if (is_system_file(&st)) {
    *err = translate_errors(EROFS);
    return;
  }

  // No permissions check here - user should be allowed to modify all file
  // permissions
  // TODO: Figure out how to modify
  if (chmod(path, flags) < 0) {
    *err = translate_errors(errno);
    return;
  }

  *err = 0;
  return;
}
