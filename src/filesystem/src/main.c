#include "main.h"
#include <emscripten.h>
#include <errno.h>
#include <fcntl.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
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
  fprintf(stdout, "Flags: %o\n", flags);
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
