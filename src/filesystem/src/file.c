#include <dirent.h>
#include <unistd.h>
#define FILE_IMPL
#include "file.h"
#include <stdio.h>

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
  case ENOTEMPTY:
    return E_NOTEMPTY;
  default:
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
  return (node_stat->st_mode & PROTECTED_BIT) == PROTECTED_BIT;
}

// Explicitly forces a filesystem synchronisation.
// Likely not needed if the IDBFS filesystem is mounted with `autoPersist`
// option set to TRUE
void file__pullFromPersist() {
#ifdef __EMSCRIPTEN__
  MAIN_THREAD_EM_ASM({
    // Force an initial sync - despite `autoPersist` flag
    FS.syncfs(
        true, function(err) {
          if (err) {
            console.error("[JS] Error during sync:", err);
          } else {
            console.log("[JS] Sync completed succesfully!");
          }
        });
    console.log("PULLED FROM PERSISTENT")
  });
#endif
  return;
}

void file__pushToPersist() {
#ifdef __EMSCRIPTEN__
  MAIN_THREAD_EM_ASM({
    // Force an initial sync - despite `autoPersist` flag
    FS.syncfs(
        false, function(err) {
          if (err) {
            console.error("[JS] Error during sync:", err);
          } else {
            console.log("[JS] Sync completed succesfully!");
          }
        });
    console.log("PUSHED TO PERSISTENT")
  });
#endif

  return;
}

void file__initialiseFSNode() {
  printf("[C] Starting up persistent filesystem at '%s'...\n",
         PERSISTENT_ROOT_NAME);

#ifdef __EMSCRIPTEN__
  MAIN_THREAD_EM_ASM(
      {
        let persistentRoot = UTF8ToString($0);
        FS.mkdir(persistentRoot);

        console.log("Moving fresh system files in...");

        // Initialise system files
        let systemFilePath = "/persistent/bin";

        // WARNING: IDBFS requires write access - however users will not be
        //          able modify regardless due to the PROTECTED_BIT being
        //          raised signifying it's a system file (0o010)
        FS.mkdir(systemFilePath, 0o710);

        // Move lua files into correct place in IDBFS
        for (const luaFile of FS.readdir("/luaSource")) {
          if (luaFile == "." || luaFile == "..") continue;

          let sourcePath = `/luaSource/${luaFile}`;
          let systemPath = `${systemFilePath}/${luaFile}`;

          // Move files into systemFilePath
          let data = FS.readFile(sourcePath);
          FS.writeFile(systemPath, data);

          // Set correct permissions on file
          FS.chmod(systemPath, 0o710);

          console.log(`ADDED: ${systemPath}`);
        }
        // Set correct permissions so parent directory cannot be modified either
        // INFO: I don't believe we're currently using dir permission bits, but future proofing regardless
        FS.chmod(systemFilePath, 0o710);

        console.log("Finished bootstrap");

      },
      PERSISTENT_ROOT_NAME);
#endif
}

int file__open(const char *restrict path, int flags, Error *restrict err) {
  // Permission checks
  struct stat st = {0};
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

void file__write(int fd, const char *restrict content, Error *restrict err) {
  // NOTE: no perm checks as the user already has the file descriptor

  int contentLength = strlen(content);
  int written = write(fd, content, contentLength);
  if (written < 0) {
    *err = translate_errors(errno);
    return;
  }
  *err = 0;
  return;
}

// Reads up to `amt`, returning whatever it was able to read
void file__read(int fd, int amt, ReadResult *restrict rr, Error *restrict err) {
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
void file__read_all(int fd, ReadResult *restrict rr, Error *restrict err) {
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
  if (rr->size != 0) {
    rr->data = malloc(rr->size * sizeof(char));
    if (!rr->data) {
      *err = translate_errors(errno);
      free(buf);
      return;
    }

    // copy the buffer into our String output struct
    memcpy(rr->data, buf, rr->size);
  }

  // free the buffer
  free(buf);

  // No error
  *err = 0;
  return;
}

void file__read_line(int fd, ReadResult *restrict rr, Error *err) {
  FILE *stream = fdopen(fd, "r");
  if (ferror(stream)) {
    *err = translate_errors(errno);
    return;
  }

  rr->data = NULL;
  rr->size = -1;

  char *line = NULL;
  size_t buffer_size = 0;

  ssize_t read_length = getline(&line, &buffer_size, stream);
  if (read_length == -1) {
    if (ferror(stream)) *err = translate_errors(errno);
    else *err = 0; // EOF
    fclose(stream);
    free(line);
    return;
  }

  rr->data = line;
  rr->size = (int)read_length;
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
void file__remove(const char *restrict path, Error *restrict err) {
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

void file__move(const char *restrict old_path, const char *restrict new_path, Error *restrict err) {
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

void file__make_dir(const char *restrict path, Error *restrict err) {
  // NOTE: No permission checks as we're not enforcing permissions
  //       on directories.

  int error = mkdir(path, 0700);
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

char **file__read_dir(const char *restrict path, int *restrict err) {
  DIR *dir = NULL;
  char **buf = NULL;
  static const int CHUNK = 16;
  int len = 0, cap = 0;
  
  dir = opendir(path);
  if (dir == NULL) {
    *err = translate_errors(errno);
    return NULL;
  }

  cap = CHUNK;
  buf = malloc(cap * sizeof(*buf));
  if (buf == NULL) {
    *err = translate_errors(errno);
    goto cleanup;
  }

  while (true) {
    errno = 0;
    struct dirent *ent = readdir(dir);
    if (ent == NULL && errno != 0) {
      *err = translate_errors(errno);
      goto cleanup;
    }
    if (ent == NULL) break;
    if (len >= cap) {
      char **tmp = realloc(buf, (cap + CHUNK) * sizeof(*buf));
      if (tmp == NULL) {
        *err = translate_errors(errno);
        goto cleanup;
      }
      buf = tmp;
      cap += CHUNK;
    }
    buf[len] = strdup(ent->d_name);
    if (buf[len] == NULL) {
      *err = translate_errors(errno);
      goto cleanup;
    }
    len++;
  }

  if (len + 1 > cap) {
    char **tmp = realloc(buf, (len + 1) * sizeof(*buf));
    if (tmp == NULL) {
      *err = translate_errors(errno);
      goto cleanup;
    }
    buf = tmp;
  }
  buf[len] = NULL;

  *err = 0;
  closedir(dir);
  return buf;

cleanup:
  for (int i = 0; i < len; i++) {
    free(buf[i]);
  }
  free(buf);
  if (dir) closedir(dir);
  return NULL;
}

void file__stat(const char *restrict name, StatResult *restrict sr, Error *restrict err) {
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
    sr->type = 1; // Directory
  } else {
    // We only support files and directories
    sr->type = 0; // file (technically anything that isn't a directory)
  }

  sr->perm = file_stat.st_mode & 0710; // bitmask user perms
  sr->atime.sec = (int)file_stat.st_atim.tv_sec;
  sr->atime.nsec = (int)file_stat.st_atim.tv_nsec;
  sr->mtime.sec = (int)file_stat.st_mtim.tv_sec;
  sr->mtime.nsec = (int)file_stat.st_mtim.tv_nsec;
  sr->ctime.sec = (int)file_stat.st_ctim.tv_sec;
  sr->ctime.nsec = (int)file_stat.st_ctim.tv_nsec;

  *err = 0;
  return;
}

void file__fdstat(int fd, StatResult *restrict sr, Error *restrict err) {
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
    sr->type = 1; // Directory
  } else {
    // We only support files and directories
    sr->type = 0; // file (technically anything that isn't a directory)
  }

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

void file__change_dir(const char *restrict path, Error *restrict err) {
  // NOTE: No permission checks here as directory permissions are ignored

  if (chdir(path) < 0) {
    *err = translate_errors(errno);
    return;
  }

  *err = 0;
  return;
}

// Changes FILE permissions (only for user - single user OS,
// 0[use][ignore][ignore])
void file__permit(const char *restrict path, int flags, Error *restrict err) {
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

void file__truncate(int fd, int length, Error *err) {
  if (ftruncate(fd, length) == -1) {
    *err = translate_errors(errno);
    return;
  }
}

// Resulting pointer has static lifetime
char *file__cwd(Error *err) {
  static char cwd[PATH_MAX] = {0};
  char *errorPtr = getcwd(cwd, PATH_MAX);
  if (errorPtr == NULL) {
    *err = translate_errors(errno);
    return NULL;
  }
  return cwd;
}
