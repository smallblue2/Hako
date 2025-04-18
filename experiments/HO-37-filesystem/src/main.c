/*
 *
 * TODO:
 *  - INITIALISATION + MOUNTING
 *    - Proper bootstrap [x]
 *  - FILE OPERATIONS
 *    - Create a file [x]
 *    - Read a file [x]
 *    - Write to a file [x]
 *    - Unlink a file [x]
 *    - Rename a file [x]
 *    - Access a file [x]
 *  - DIRECTORY OPERATION
 *    - Create a directory [x]
 *    - Read a directory [x]
 *    - Unlink a directory [x]
 *  - METADATA OPERATIONS
 *    - Stat a node (stat) [x]
 *    - Stat a link (lstat) [x]
 *    - Set mode
 *    - Set timestamps
 *    - Set metadata (permissions, timestamps, any custom logic, etc)
 *  - FILE DESCRIPTORS
 *    - Open a file [x]
 *    - Close a file [x]
 *    - Read from descriptor [x]
 *    - Write from descriptor [x]
 *    - Seek [x]
 *  - ADVANCED [DO WE WANT?]
 *    - Symbolic links [x]
 *    - Hard links [don't think is supported by emscripten]
 *    - File locking for concurrency [not implementing]
 *    - Copy files [x]
 *    - Truncate file [x]
 *
 */

#include <dirent.h>
#include <emscripten.h>
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <time.h>
#include <unistd.h>
#include <utime.h>

char *PERSISTENT_ROOT_NAME = "/persistent";
int MAX_PATH_LENGTH = 256;

// Explicitly forces a filesystem synchronisation.
// Likely not needed if the IDBFS filesystem is mounted with `autoPersist`
// option set to TRUE
void syncFS() {
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

  return;
}

// Mounts filesystem, creating structure if required.
void initialiseFS() {
  printf("[C] Starting up persistent filesystem at '%s'...\n",
         PERSISTENT_ROOT_NAME);

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

  syncFS(); // Not sure if needed due to autoPersist: true

  printf("[C] Finished filesystem initialisation!\n");

  return;
}

// Prints the stat of a node at `file_path`
void printNodeStat(char *file_path) {
  // Avoid buffer overflows - safer way rather than just printf
  char full_path[MAX_PATH_LENGTH];
  snprintf(full_path, sizeof(full_path), "%s", file_path);

  struct stat file_stat;
  if (stat(full_path, &file_stat) == -1) {
    fprintf(stderr, "[C] Error stat-ing '%s'!\n", full_path);
    return;
  }

  // File information
  printf("File: %s\n", file_path);
  printf("Size: %ld bytes\n", file_stat.st_size);
  printf("Blocks: %ld\n", file_stat.st_blocks);
  printf("IO Block: %ld bytes\n", file_stat.st_blksize);
  printf("Device: %ldh/%ldd\n", (long)file_stat.st_dev, (long)file_stat.st_dev);
  printf("Inode: %ld\n", (long)file_stat.st_ino);
  printf("Links: %ld\n", (long)file_stat.st_nlink);

  // File type
  printf("File type: ");
  if (S_ISREG(file_stat.st_mode))
    printf("regular file\n");
  else if (S_ISDIR(file_stat.st_mode))
    printf("directory\n");
  else if (S_ISLNK(file_stat.st_mode))
    printf("symbolic link\n");
  else if (S_ISCHR(file_stat.st_mode))
    printf("character device\n");
  else if (S_ISBLK(file_stat.st_mode))
    printf("block device\n");
  else if (S_ISFIFO(file_stat.st_mode))
    printf("FIFO/pipe\n");
  else if (S_ISSOCK(file_stat.st_mode))
    printf("socket\n");
  else
    printf("unknown\n");

  // Permissions
  printf("Access: %o\n", file_stat.st_mode & 0777);

  // Timestamps
  printf("Last access: %s", ctime(&file_stat.st_atime));
  printf("Last modification: %s", ctime(&file_stat.st_mtime));
  printf("Last status change: %s", ctime(&file_stat.st_ctime));

  return;
}

int fs_open(const char *pathname, int flags, int mode) {
  return open(pathname, flags, mode);
}

int fs_close(int fd) { return close(fd); }

int fs_write(int fd, void *buf, int count) { return write(fd, buf, count); }

int fs_lseek(int fd, int offset, int whence) {
  return lseek(fd, offset, whence);
}

typedef struct {
  unsigned char *data;
  int size;
} ReadResult;

void fs_read(int fd, ReadResult *rr, int count) {
  // Create buffer
  unsigned char *buffer = (unsigned char *)malloc(count);
  if (!buffer) {
    perror("Failed to create buffer to read file");
    return;
  }

  // Read into buffer
  int bytesRead = read(fd, buffer, count);
  rr->data = buffer;
  rr->size = bytesRead;

  return;
}

int fs_unlink(const char *filename) { return unlink(filename); }

int fs_rename(const char *old, const char *new) { return rename(old, new); }

int fs_access(const char *name, int type) { return access(name, type); }

typedef struct {
  int sec;
  int nsec;
} Time;

typedef struct { // 48 bytes
  int size;
  int blocks;
  int blocksize;
  int ino;
  int nlink;
  int mode; // 24 bytes
  Time atime;
  Time mtime;
  Time ctime; // 24 bytes
} StatResult;

void fs_stat(const char *name, StatResult *sr) {
  struct stat fileStat;
  if (stat(name, &fileStat) < 0) {
    perror("Failed to stat file!");
  }

  sr->size = fileStat.st_size;
  sr->blocks = fileStat.st_blocks;
  sr->blocksize = fileStat.st_blksize;
  sr->ino = fileStat.st_ino;
  sr->nlink = fileStat.st_nlink;
  sr->mode = fileStat.st_mode;
  sr->atime.sec = (int)fileStat.st_atim.tv_sec;
  sr->atime.nsec = (int)fileStat.st_atim.tv_nsec;
  sr->mtime.sec = (int)fileStat.st_mtim.tv_sec;
  sr->mtime.nsec = (int)fileStat.st_mtim.tv_nsec;
  sr->ctime.sec = (int)fileStat.st_ctim.tv_sec;
  sr->ctime.nsec = (int)fileStat.st_ctim.tv_nsec;

  return;
}

void fs_lstat(const char *name, StatResult *sr) {
  struct stat fileStat;
  if (lstat(name, &fileStat) < 0) {
    perror("Failed to stat file!");
  }

  sr->size = fileStat.st_size;
  sr->blocks = fileStat.st_blocks;
  sr->blocksize = fileStat.st_blksize;
  sr->ino = fileStat.st_ino;
  sr->nlink = fileStat.st_nlink;
  sr->mode = fileStat.st_mode;
  sr->atime.sec = (int)fileStat.st_atim.tv_sec;
  sr->atime.nsec = (int)fileStat.st_atim.tv_nsec;
  sr->mtime.sec = (int)fileStat.st_mtim.tv_sec;
  sr->mtime.nsec = (int)fileStat.st_mtim.tv_nsec;
  sr->ctime.sec = (int)fileStat.st_ctim.tv_sec;
  sr->ctime.nsec = (int)fileStat.st_ctim.tv_nsec;

  return;
}

int fs_symlink(const char *target, const char *linkpath) {
  return symlink(target, linkpath);
}

// TODO: Figure out why this doesn't work - maybe not supported by emscripten?
int fs_link(const char *target, const char *linkpath) {
  return link(target, linkpath);
}

int fs_mkdir(const char *path, int mode) { return mkdir(path, mode); }

typedef struct {
  DIR *dirp; // Directory pointer
  int inUse;
} DirHandle;

// Global array to store open directories
#define MAX_DIR_HANDLES 128
static DirHandle dirHandles[MAX_DIR_HANDLES] = {0};

int fs_opendir(const char *path) {
  DIR *d = opendir(path);

  if (!d) {
    fprintf(stderr, "[C] Opendir failed for '%s': '%s'\n", path,
            strerror(errno));
    return -1;
  }

  // Find a free slot in global dirHandles array
  for (int i = 0; i < MAX_DIR_HANDLES; i++) {
    if (!dirHandles[i].inUse) {
      dirHandles[i].dirp = d;
      dirHandles[i].inUse = 1;
      // 'i' is the 'directory descriptor'
      return i + 1;
    }
  }

  // No free slots
  closedir(d);
  fprintf(stderr, "[C] Too many directories open!\n");
  return -1;
}

// Read the next entry from an open directory
int fs_readdir(int dirHandle, char *nameBuf) {

  dirHandle--;

  // handle validatin
  if (dirHandle < 0 || dirHandle >= MAX_DIR_HANDLES ||
      !dirHandles[dirHandle].inUse) {
    fprintf(stderr, "[C] fs_readdir: invalid directory handle: %d\n",
            dirHandle);
    return -1;
  }

  DIR *d = dirHandles[dirHandle].dirp;
  struct dirent *entry = readdir(d);
  if (!entry) {
    // End of directory or error
    return -1;
  }

  // Copy filename into provided buffer
  snprintf(nameBuf, 256, "%s", entry->d_name);

  return 0; // success
}

int fs_closedir(int dirHandle) {

  dirHandle--;

  // handle validatin
  if (dirHandle < 0 || dirHandle >= MAX_DIR_HANDLES ||
      !dirHandles[dirHandle].inUse) {
    fprintf(stderr, "[C] fs_closedir: invalid directory handle: %d\n",
            dirHandle);
    return -1;
  }

  if (closedir(dirHandles[dirHandle].dirp) != 0) {
    fprintf(stderr, "[C] closedir failed: %s\n", strerror(errno));
    return -1;
  }

  dirHandles[dirHandle].dirp = NULL;
  dirHandles[dirHandle].inUse = 0;
  return 0;
}

int fs_rmdir(const char *path) { return rmdir(path); }

int fs_chdir(const char *path) { return chdir(path); }

int fs_chmod(const char *path, int mode) { return chmod(path, mode); }

int fs_utime(const char *path, int atim, int mtim) {
  struct utimbuf new_times;

  new_times.actime = atim;
  new_times.modtime = mtim;

  return utime(path, &new_times);
}

// FROM stackoverflow: How can I copy a file on Unix using C? [https://stackoverflow.com/questions/2180079/how-can-i-copy-a-file-on-unix-using-c]
int fs_cp(const char *from, const char *to) {
  int fd_to, fd_from;
  char buf[4096];
  ssize_t nread;
  int saved_errno;

  fd_from = open(from, O_RDONLY);
  if (fd_from < 0)
    return -1;

  fd_to = open(to, O_WRONLY | O_CREAT | O_EXCL, 0666);
  if (fd_to < 0)
    goto out_error;

  while (nread = read(fd_from, buf, sizeof buf), nread > 0) {
    char *out_ptr = buf;
    ssize_t nwritten;

    do {
      nwritten = write(fd_to, out_ptr, nread);

      if (nwritten >= 0) {
        nread -= nwritten;
        out_ptr += nwritten;
      } else if (errno != EINTR)
        goto out_error;
    } while (nread > 0);
  }

  if (nread == 0) {
    if (close(fd_to) < 0) {
      fd_to = -1;
      goto out_error;
    }
    close(fd_from);

    return 0;
  }

out_error:
  saved_errno = errno;

  close(fd_from);
  if (fd_to >= 0)
    close(fd_to);
  errno = saved_errno;

  return -1;
}

int fs_ftruncate(int fd, int length) {
  return ftruncate(fd, length);
}

int main() {
  initialiseFS();
  return 0;
}
