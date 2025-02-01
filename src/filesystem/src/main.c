#include "main.h"
#include <errno.h>
#include <fcntl.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <emscripten.h>

int Entry__name() { return offsetof(Entry, name); }
int Entry__len() { return offsetof(Entry, len); }
int Entry__dirp() { return offsetof(Entry, dirp); }

int Read_Result__data() { return offsetof(Read_Result, data); }
int Read_Result__size() { return offsetof(Read_Result, size); }

// Creates a null-terminated string
char *stoz(String str) { // Has to be freed!
  int len = strlen(str.data);
  char *res = calloc(len + 1, sizeof(char));
  if (res == NULL) {
    return NULL;
  }
  memcpy(res, str.data, len);
  return res;
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

int file__open(char *path, int flags, Error *err) {
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

void file__write(int fd, char *content, Error *err) {
  int contentLength = strlen(content);
  int written = write(fd, content, contentLength);
  if (written < 0) {
    *err = errno;
  }
  *err = 0;
  return;
}

// Reads up to `amt`, returning whatever it was able to read
String file__read(int fd, int amt, Error *err) {
  String out;
  out.data = NULL;
  out.len = -1;

  char *buf = calloc(amt, sizeof(char));
  if (!buf) {
    *err = errno;
    return out;
  }

  int amount_read = read(fd, buf, amt);
  if (amount_read < 0) {
    *err = errno;
    return out;
  }

  out.data = malloc(amount_read);
  if (!out.data) {
    *err = errno;
    return out;
  }

  // Copy buffer to our String struct
  memcpy(out.data, buf, amt);
  // Free our buffer
  free(buf);

  // Set length of output string
  out.len = amount_read;

  *err = 0;
  return out;
}

// Reads the entirety of a files contents
String file__read_all(int fd, Error *err) {
  String out;
  out.data = NULL;
  out.len = -1;

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
        return out;
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
    return out;
  }

  // NOTE: could technically reallocate here down to the exact size needed
  // but that can also be done by the caller if it is an issue

  // Calculate the total number of bytes read
  out.len = (ptr - buf);

  // Allocate enough space for the files contents into our string struct
  out.data = malloc(out.len * sizeof(char));
  if (!out.data) {
    *err = errno;
    free(buf);
    return out;
  }

  // copy the buffer into our String output struct
  memcpy(out.data, buf, out.len);

  // free the buffer
  free(buf);

  // No error
  *err = 0;
  return out;
}
