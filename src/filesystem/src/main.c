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
#include <libgen.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/stat.h>
#include <time.h>
#include <unistd.h>
#include <utime.h>

char *PERSISTENT_ROOT_NAME = "/persistent";
int MAX_PATH_LENGTH = 256;

// Explicitly forces a filesystem synchronisation.
// Likely not needed if the IDBFS filesystem is mounted with `autoPersist`
// option set to TRUE
int syncFS() {
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

  return 0;
}

// Mounts filesystem, creating structure if required.
int initialiseFS() {
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

  syncFS(); // Not sure if needed due to autoPersist: true

  printf("[C] Finished filesystem initialisation!\n");

  return 0;
}

// Permission types
#define PERMISSION_READ 1
#define PERMISSION_WRITE 2
#define PERMISSION_EXEC 4

bool check_permission(const char *path, int permission) {
  printf("Checking perms of '%s'\n", path);
  struct stat file_stat;
  if (stat(path, &file_stat) < 0) {
    perror("Failed to stat file");
    return false;
  }

  uid_t current_uid = getuid();
  gid_t current_gid = getgid();

  // Check owner permissions
  if (current_uid == file_stat.st_uid) {
    if ((permission & PERMISSION_READ) && !(file_stat.st_mode & S_IRUSR))
      return false;
    if ((permission & PERMISSION_WRITE) && !(file_stat.st_mode & S_IWUSR))
      return false;
    if ((permission & PERMISSION_EXEC) && !(file_stat.st_mode & S_IXUSR))
      return false;
  }
  // Check group permissions
  else if (current_gid == file_stat.st_gid) {
    if ((permission & PERMISSION_READ) && !(file_stat.st_mode & S_IRGRP))
      return false;
    if ((permission & PERMISSION_WRITE) && !(file_stat.st_mode & S_IWGRP))
      return false;
    if ((permission & PERMISSION_EXEC) && !(file_stat.st_mode & S_IXGRP))
      return false;
  }
  // Check other permissions
  else {
    if ((permission & PERMISSION_READ) && !(file_stat.st_mode & S_IROTH))
      return false;
    if ((permission & PERMISSION_WRITE) && !(file_stat.st_mode & S_IWOTH))
      return false;
    if ((permission & PERMISSION_EXEC) && !(file_stat.st_mode & S_IXOTH))
      return false;
  }

  return true;
}

// Prints the stat of a node at `file_path`
void printNodeStat(char *file_path, int file_path_length) {
  struct stat file_stat;
  if (stat(file_path, &file_stat) == -1) {
    char temp[512];
    snprintf(temp, sizeof(temp), "[C] Error stat-ing '%.*s'!\n",
             file_path_length, file_path);
    fputs(temp, stderr);
    return;
  }

  // File information
  printf("File: %s\n", file_path);
  printf("Size: %lld bytes\n", file_stat.st_size);
  printf("Blocks: %d\n", file_stat.st_blocks);
  printf("IO Block: %d bytes\n", file_stat.st_blksize);
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
  if ((flags & O_RDONLY) && !check_permission(pathname, PERMISSION_READ)) {
    fprintf(stderr, "Permission denied: Cannot read %s\n", pathname);
    errno = EACCES;
    return -1;
  }

  if ((flags & O_WRONLY) && !check_permission(pathname, PERMISSION_WRITE)) {
    fprintf(stderr, "Permisison denied: Cannot write to %s\n", pathname);
  }

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

int fs_stat(const char *name, StatResult *sr) {
  if (!check_permission(name, PERMISSION_EXEC)) {
    fprintf(stderr, "Permission denied: Cannot stat %s\n", name);
    errno = EACCES;
    return -1;
  }

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

  return 0;
}

int fs_lstat(const char *name, StatResult *sr) {
  if (!check_permission(name, PERMISSION_EXEC)) {
    fprintf(stderr, "Permission denied: Cannot stat %s\n", name);
    errno = EACCES;
    return -1;
  }

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

  return 0;
}

int fs_chmod(const char *path, int mode) {
  struct stat file_stat;
  if (stat(path, &file_stat) < 0) {
    perror("Failed to stat file for chmod");
    return -1;
  }

  // Check if current user owns the file
  if (file_stat.st_uid != getuid()) {
    fprintf(stderr, "Permission denied: Cannot chmod %s\n", path);
    errno = EPERM;
    return -1;
  }

  return chmod(path, mode);
}

int fs_utime(const char *path, int atim, int mtim) {
  struct stat file_stat;
  if (stat(path, &file_stat) < 0) {
    perror("Failed to stat file for utime");
    return -1;
  }

  // Check if user owns the file or has write permission
  if (file_stat.st_uid != getuid() &&
      !check_permission(path, PERMISSION_WRITE)) {
    fprintf(stderr, "Permission denied: Cannot update timestamps for %s\n",
            path);
    errno = EACCES;
    return -1;
  }

  struct utimbuf new_times;

  new_times.actime = atim;
  new_times.modtime = mtim;

  return utime(path, &new_times);
}

int fs_ftruncate(int fd, int length) { return ftruncate(fd, length); }

int fs_chown(const char *path, int owner, int group) {
  struct stat file_stat;
  if (stat(path, &file_stat) < 0) {
    perror("Failed to stat file for chmod");
    return -1;
  }

  // Check if current user owns the file
  if (file_stat.st_uid != getuid()) {
    fprintf(stderr, "Permission denied: Cannot chown %s\n", path);
    errno = EPERM;
    return -1;
  }

  return chown(path, owner, group);
}

int main() {
  initialiseFS();
  return 0;
}
