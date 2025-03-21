#include <emscripten.h>
#include <errno.h>
#include <fcntl.h>
#include <stddef.h>
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#include "processes.h"

// void proc__close_input(Error *err);
EM_JS(void, proc__close_input, (Error *err), {
  self.proc.stdin.close();
  setValue(err, 0, 'i32');
})

// void proc__close_output(Error *err);
EM_JS(void, proc__close_output, (Error *err), {
  self.proc.stdout.close();
  setValue(err, 0, 'i32');
})

// void proc__close_error(Error *err);
EM_JS(void, proc__close_error, (Error *err), {
  self.proc.stderr.close();
  setValue(err, 0, 'i32');
})

// int proc__input_pipe(char* buf, int max_bytes, Error *err);
EM_JS(int, proc__input_pipe, (char *restrict buf, int max_bytes, Error *restrict err), {
  let s = self.proc.input(max_bytes - 1); // -1 for null terminator
  stringToUTF8(s, buf, max_bytes);
  setValue(err, 0, 'i32');
  return s.length + 1; // +1 for null terminator
})

// int proc__input_exact_pipe(char *buf, int exact_byes, Error *err);
EM_JS(int, proc__input_exact_pipe, (char *restrict buf, int exact_bytes, Error *restrict err), {
  let s = self.proc.inputExact(exact_bytes - 1); // -1 for null terminator
  stringToUTF8(s, buf, exact_bytes);
  setValue(err, 0, 'i32');
  return s.length + 1; // +1 for null terminator
})

// WARNING: BUF MUST BE FREED
// char *proc__input_all_pipe(Error *err)
EM_JS(char *, proc__input_all_pipe, (Error *err), {
  const ptr = stringToNewUTF8(self.proc.inputAll());
  if (!ptr) {
    setValue(err, ERROR_CODES.ENOMEM, 'i32');
    return null;
  }
  setValue(err, 0, 'i32');
  return ptr;
})

// WARNING: BUF MUST BE FREED
// char *proc__input_line_pipe(Error *err)
EM_JS(char *, proc__input_line_pipe, (Error *err), {
  const ptr = stringToNewUTF8(self.proc.inputLine());
  if (!ptr) {
    setValue(err, ERROR_CODES.ENOMEM, 'i32');
    return null;
  }
  setValue(err, 0, 'i32');
  return ptr;
})

// proc__output_pipe(char* buf, int len, Error *err)
EM_JS(void, proc__output_pipe, (const char *restrict buf, int len, Error *restrict err), {
  var s = UTF8ToString(buf, len);
  self.proc.output(s);
  setValue(err, 0, 'i32');
})

// proc__error_pipe(char* buf, int len, Error *err)
EM_JS(void, proc__error_pipe, (const char *restrict buf, int len, Error *restrict err), {
  var s = UTF8ToString(buf, len);
  self.proc.error(s);
  setValue(err, 0, 'i32');
  return s.length;
})

// proc__wait(int pid, Error *err)
EM_JS(int, proc__wait, (int pid, Error *err), {
  let exitCode = self.proc.wait(pid);
  setValue(err, 0, 'i32');
  return exitCode;
})

// proc__create(char *buf, int len, int pipe_stdin, int pipe_stdout, Error *err)
EM_JS(int, proc__create, (const char *restrict buf, int len, const char *restrict *args, int args_len, bool pipe_stdin, bool pipe_stdout, Error *restrict err), {
  let jsArgs = [];
  for (let i = 0; i < args_len; i++) {
    jsArgs.push(UTF8ToString(getValue(args + (i * 4), 'i8*')));
  }
  let luaPath = UTF8ToString(buf, len);
  let createdPID = self.proc.create(luaPath, jsArgs, Boolean(pipe_stdin), Boolean(pipe_stdout));
  if (createdPID < 0) {
    setValue(err, createdPID, 'i32');
    return -1;
  }
  setValue(err, 0, 'i32');
  return createdPID;
})

// proc__kill(int pid)
EM_JS(void, proc__kill, (int pid, Error *err), {
  let errorCode = self.proc.kill(pid);
  setValue(err, errorCode, 'i32');
})

// proc__list(int *length, Error *err)
EM_JS(Process*, proc__list, (int *restrict length, Error *restrict err), {
  try {
    let procJSON = self.proc.list();
    let heapAllocationSize = procJSON.length * 16; // C 'Process' struct is 16 bytes long
    // WARNING: NEEDS TO BE FREED IN C
    let memPointer = _malloc(heapAllocationSize);
    procJSON.forEach((item, index) => {
      const off = index * 16;
      setValue(memPointer + off, item.pid, 'i32');
      setValue(memPointer + off + 4, Math.floor(item.alive), 'i32');
      setValue(memPointer + off + 8, Math.floor(item.created), 'i32');
      setValue(memPointer + off + 12, item.state, 'i32');
    });
    setValue(err, 0, 'i32');
    setValue(length, procJSON.length, 'i32');
    return memPointer;
  } catch (e) {
    setValue(err, -1, 'i32');
    setValue(length, 0, 'i32');
    return -1;
  }
})

// proc__get_pid(Error *err)
EM_JS(int, proc__get_pid, (Error *err), {
  setValue(err, 0, 'i32');
  return self.proc.pid;
})

// proc__pipe(int out_pid, int in_pid, Error *err)
EM_JS(void, proc__pipe, (int out_pid, int in_pid, Error *err), {
  let errCode = self.proc.pipe(out_pid, in_pid);
  setValue(err, errCode, 'i32');
})

// proc__is_stdin_pipe(Error *err)
EM_JS(bool, proc__is_stdin_pipe, (Error *err), {
  setValue(err, 0, 'i32');
  return self.proc.isPipeable(self.proc.StreamDescriptor.STDIN);
})

// proc__is_stdout_pipe(Error *err)
EM_JS(bool, proc__is_stdout_pipe, (Error *err), {
  setValue(err, 0, 'i32');
  return self.proc.isPipeable(self.proc.StreamDescriptor.STDOUT);
})

int proc__input(char *restrict buf, int max_bytes, Error *restrict err) {
  if (proc__is_stdin_pipe(err)) {
    if (*err < 0) {
      return -1;
    }
    return proc__input_pipe(buf, max_bytes, err);
  }
  size_t bytesRead = fread(buf, 1, max_bytes - 1, stdin);
  if (ferror(stdin)) {
    *err = -9; // TODO: What error to report here?
    return -1;
  }

  buf[bytesRead] = '\0';
  *err = 0;
  return (int)bytesRead;
}

int proc__input_exact(char *restrict buf, int exact_bytes, Error *restrict err) {
  if (proc__is_stdin_pipe(err)) {
    if (*err < 0) {
      printf("FAIL\n");
      return -1;
    }
    return proc__input_exact_pipe(buf, exact_bytes, err);
  }

  // Block until `exact_bytes` have been read
  size_t totalBytesRead = 0;
  size_t bytesLeft = (size_t)exact_bytes;

  while (bytesLeft > 0) {
    // Try to read what's left in one chunk
    size_t n = fread(buf + totalBytesRead, 1, bytesLeft, stdin);

    // Check for any errors
    if (ferror(stdin)) {
      *err = -9; // TODO: Decide on what error to state
      return -1;
    }

    // If 0 bytes were read, but not an error, it's EOF
    if (n == 0) {
      // Possibly partial read
      if (feof(stdin)) {
        *err = -19; // EOF (processes/js/common.js)
        return -1;
      }
    }

    totalBytesRead += n;
    bytesLeft -= n;
  }

  // We have read exactly `exact_bytes`!
  *err = 0;

  return (int)totalBytesRead;
}

// WARNING: MUST FREE BUF
char *proc__input_all(Error *err) {
  if (proc__is_stdin_pipe(err)) {
    if (*err != 0) {
      return NULL;
    }
    return proc__input_all_pipe(err);
  }

  // Initial size
  size_t capacity = 1024;
  size_t length = 0;
  char *buffer = malloc(capacity);
  if (!buffer) {
    *err = -18; // Failed to assign memory (processes/js/common.js)
    return NULL;
  }

  int c;
  while ((c = getchar()) != EOF) {
    // If we need to expand buffer
    if (length + 1 >= capacity) {
      // double it
      capacity *= 2;
      char *temp = realloc(buffer, capacity);
      if (!temp) {
        free(buffer);
        *err = -18; // Failed to assign memory (processes/js/common.js)
        return NULL;
      }
      buffer = temp;
    }
    buffer[length++] = (char)c;
  }

  // Null terminate
  buffer[length] = '\0';

  *err = 0;

  return buffer;
}

char *proc__input_line(Error *err) {
  if (proc__is_stdin_pipe(err)) {
    if (*err != 0) {
      return NULL;
    }
    return proc__input_line_pipe(err);
  }

  size_t n = 0;
  char *lineptr = NULL;
  if (getline(&lineptr, &n, stdin) == -1 && ferror(stdin)) {
    *err = errno;
    return NULL;
  }

  int len = strnlen(lineptr, n);
  if (!feof(stdin)) {
    // This means that the newline was included
    // Replace it with a null byte
    assert(lineptr[len - 1] == '\n');
    lineptr[len - 1] = '\0';
  }

  *err = 0;
  return lineptr;
}

void proc__output(const char *restrict buf, int len, Error *restrict err) {
  if (proc__is_stdout_pipe(err)) {
    if (*err != 0) {
      return;
    }
    proc__output_pipe(buf, len, err);
    return;
  }

  int num_written = fwrite(buf, 1, len, stdout);
  if (num_written < len) {
    *err = -13; // Failed to write to stdout (processes.js/js/common.js)
    return;
  }
  fflush(stdout);
  *err = 0;
}

// void proc__start(int pid, Error *err)
EM_JS(void, proc__start, (int pid, Error *err), {
  let errCode = self.proc.start(pid);
  setValue(err, errCode, 'i32');
})

// const char *proc__get_lua_code(char *buf, int len, Error *err)
EM_JS(char *, proc__get_lua_code, (Error *err), {
  const ptr = stringToNewUTF8(self.proc.luaCode);
  if (!ptr) {
    setValue(err, ERROR_CODES.ENOMEM, 'i32');
    return null;
  }
  return ptr;
})

EM_JS(void, proc__exit, (int exit_code, Error *err), {
  self.proc.exit(exit_code);
  setValue(err, 0, 'i32');
})

// WARNING: NEED TO CLEAR ARGV IN C
// void proc__args(int *argc, char ***argv, Error *err);
EM_JS(void, proc__args, (int *restrict argc, char *restrict **argv, Error *restrict err), {
  const jsArgs = self.proc.args;

  // Set argc
  const length = jsArgs.length;
  setValue(argc, length, 'i32');

  // Set argv
  let argvPointer =
      _malloc((length + 1) * 4); // Emscripten is 32-bit (4 bit pointer)
  for (let i = 0; i < length; i++) {
    const strPtr = stringToNewUTF8(jsArgs[i].toString());
    setValue(argvPointer + i * 4, strPtr, '*');
  }

  // null terminate argv array
  setValue(argvPointer + length * 4, 0, 'i8');

  // set argv
  setValue(argv, argvPointer, '*');

  // Set Error to 0
  setValue(err, 0, 'i32');
})
