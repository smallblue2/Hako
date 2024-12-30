/*
 *
 * TODO:
 *  - INITIALISATION + MOUNTING
 *    - Proper bootstrap
 *  - FILE OPERATIONS
 *    - Create a file
 *    - Read a file
 *    - Write to a file
 *    - Unlink a file
 *    - Rename a file
 *    - Check existence
 *  - DIRECTORY OPERATION
 *    - Create a directory
 *    - Read a directory
 *    - Unlink a directory
 *    - Directory Traversal (FS.readdir())
 *  - METADATA OPERATIONS
 *    - Stat a node (stat)
 *    - Stat a link (lstat)
 *    - Set metadata (permissions, timestamps, any custom logic, etc)
 *  - FILE DESCRIPTORS
 *    - Open a file
 *    - Close a file
 *    - Read from descriptor
 *    - Write from descriptor
 *    - Seek
 *  - ADVANCED [DO WE WANT?]
 *    - Symbolic links
 *    - Hard links
 *    - File locking for concurrency
 *    - Copy files
 *    - Truncate file
 *
 */

#include <emscripten.h>
#include <stdio.h>
#include <unistd.h>
#include <sys/stat.h>
#include <time.h>

char *PERSISTENT_ROOT_NAME = "/persistent";
int MAX_PATH_LENGTH = 256;

// Explicitly forces a filesystem synchronisation.
// Likely not needed if the IDBFS filesystem is mounted with `autoPersist` option
// set to TRUE
void syncFS() {
  EM_ASM({
    // Force an initial sync - despite `autoPersist` flag
    FS.syncfs(false, function(err) {
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

  EM_ASM({
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
    FS.mount(IDBFS, {autoPersist : true}, persistentRoot);
  },
  PERSISTENT_ROOT_NAME);

  // syncFS(); // Not sure if needed due to autoPersist: true

  printf("[C] Finished filesystem initialisation!\n");

  return;
}

// Writes a file synchronously (unbuffered)
void writeFile(char* file_path, char* content) {
  // Avoid buffer overflows - safer way rather than just printf
  char full_path[MAX_PATH_LENGTH];
  snprintf(full_path, sizeof(full_path), "%s", file_path);

  // Write to file
  printf("[C] Writing to '%s'...\n", full_path);
  FILE *file = fopen(full_path, "w");
  if (file) {
    fprintf(file, "%s", content);
    fclose(file);
    printf("[C] Succesfully wrote to '%s'!\n", full_path);
  } else {
    perror("[C] Error opening file for writing!\n");
  }

  // syncFS(); // Not sure if needed due to autoPersist: true

  return;
}

// Reads a file synchronously
void readFile(char* file_path) {
  // Avoid buffer overflows - safer way rather than just printf
  char full_path[MAX_PATH_LENGTH];
  snprintf(full_path, sizeof(full_path), "%s", file_path);

  // Read file
  printf("[C] Reading '%s'\n", full_path);
  FILE *file = fopen(full_path, "r");
  if (file) {
    char c;
    while ((c = getc(file)) != EOF) {
      putchar(c);
    }
    fclose(file);
  } else {
    fprintf(stderr, "[C] Error opening '%s' for reading!\n", full_path);
  }

  return;
}

// Prints the stat of a node at `file_path`
void printNodeStat(char* file_path) {
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
  if (S_ISREG(file_stat.st_mode)) printf("regular file\n");
  else if (S_ISDIR(file_stat.st_mode)) printf("directory\n");
  else if (S_ISLNK(file_stat.st_mode)) printf("symbolic link\n");
  else if (S_ISCHR(file_stat.st_mode)) printf("character device\n");
  else if (S_ISBLK(file_stat.st_mode)) printf("block device\n");
  else if (S_ISFIFO(file_stat.st_mode)) printf("FIFO/pipe\n");
  else if (S_ISSOCK(file_stat.st_mode)) printf("socket\n");
  else printf("unknown\n");

  // Permissions
  printf("Access: %o\n", file_stat.st_mode & 0777);

  // Timestamps
  printf("Last access: %s", ctime(&file_stat.st_atime));
  printf("Last modification: %s", ctime(&file_stat.st_mtime));
  printf("Last status change: %s", ctime(&file_stat.st_ctime));

  return;
}

int main() {
  initialiseFS();
  writeFile("/persistent/test0.txt", "This is a test!\n");
  writeFile("/persistent/test1.txt", "This is another test!\n");
  readFile("/persistent/test2.txt");
  printNodeStat("/home");
  return 0;
}
