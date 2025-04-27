#include <assert.h>
#include <emscripten.h>
#include <errno.h>
#include <fcntl.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#include "../../filesystem/src/main.h"
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
EM_JS(int, proc__input_pipe,
      (char *restrict buf, int max_bytes, Error *restrict err), {
        let s = self.proc.input(max_bytes - 1); // -1 for null terminator
        stringToUTF8(s, buf, max_bytes);
        setValue(err, 0, 'i32');
        return s.length + 1; // +1 for null terminator
      })

// int proc__input_exact_pipe(char *buf, int exact_byes, Error *err);
EM_JS(int, proc__input_exact_pipe,
      (char *restrict buf, int exact_bytes, Error *restrict err), {
        let s = self.proc.inputExact(exact_bytes - 1); // -1 for null terminator
        stringToUTF8(s, buf, exact_bytes);
        setValue(err, 0, 'i32');
        return s.length + 1; // +1 for null terminator
      })

// WARNING: BUF MUST BE FREED
// char *proc__input_all_pipe(Error *err)
EM_JS(char *, proc__input_all_pipe, (Error * err), {
  const ptr = stringToNewUTF8(self.proc.inputAll());
  if (!ptr) {
    setValue(err, -18, 'i32'); // -18 is ENOMEM (errors.c)
    return null;
  }
  setValue(err, 0, 'i32');
  return ptr;
})

// WARNING: BUF MUST BE FREED
// char *proc__input_line_pipe(Error *err)
EM_JS(char *, proc__input_line_pipe, (Error * err), {
  const ptr = stringToNewUTF8(self.proc.inputLine());
  if (!ptr) {
    setValue(err, -18, 'i32'); // -18 is ENOMEM (errors.c)
    return null;
  }
  setValue(err, 0, 'i32');
  return ptr;
})

// proc__output_pipe(char* buf, int len, Error *err)
EM_JS(void, proc__output_pipe,
      (const char *restrict buf, int len, Error *restrict err), {
        var s = UTF8ToString(buf, len);
        self.proc.output(s);
        setValue(err, 0, 'i32');
      })

// proc__error_pipe(char* buf, int len, Error *err)
EM_JS(void, proc__error_pipe,
      (const char *restrict buf, int len, Error *restrict err), {
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

// proc__create(const char *restrict buf, int len, const char *restrict *args,
// int args_len, bool pipe_stdin, bool pipe_stdout, const char *restrict
// redirect_in, const char *restrict redirect_out, Error *restrict err)
EM_JS(int, proc__create,
      (const char *restrict buf, int len, const char *restrict *args,
       int args_len, bool pipe_stdin, bool pipe_stdout,
       const char *restrict redirect_in, const char *restrict redirect_out,
       const char *restrict cwd, Error *restrict err),
      {
        let jsArgs = [];
        for (let i = 0; i < args_len; i++) {
          jsArgs.push(UTF8ToString(getValue(args + (i * 4), 'i8*')));
        }
        let luaPath = UTF8ToString(buf, len);
        let redirectIn = UTF8ToString(redirect_in);
        let redirectOut = UTF8ToString(redirect_out);
        let jsCwd = UTF8ToString(cwd);
        let createdPID =
            self.proc.create(luaPath, jsArgs, Boolean(pipe_stdin),
                             Boolean(pipe_stdout), redirectIn, redirectOut, jsCwd);
        if (createdPID < 0) {
          setValue(err, createdPID, 'i32'); // Just forward error from JS
          return -1;
        }
        setValue(err, 0, 'i32');
        return createdPID;
      })

// proc__kill(int pid)
EM_JS(void, proc__kill, (int pid, Error *err), {
  let errorCode = self.proc.kill(pid);
  setValue(err, errorCode, 'i32'); // Forward error from JS
})

// proc__list(int *length, Error *err)
EM_JS(Process *, proc__list, (int *restrict length, Error *restrict err), {
  try {
    let procJSON = self.proc.list();
    let heapAllocationSize = procJSON.length * 20; // C 'Process' struct is 20 bytes long
    // WARNING: NEEDS TO BE FREED IN C
    let memPointer = _malloc(heapAllocationSize);
    procJSON.forEach((item, index) => {
      let stringPointer = stringToNewUTF8(item.path ?? "");
      const off = index * 20;
      setValue(memPointer + off, item.pid, 'i32');
      setValue(memPointer + off + 4, stringPointer, '*');
      setValue(memPointer + off + 8, Math.floor(item.alive), 'i32');
      setValue(memPointer + off + 12, Math.floor(item.created), 'i32');
      setValue(memPointer + off + 16, item.state, 'i32');
    });
    setValue(err, 0, 'i32');
    setValue(length, procJSON.length, 'i32');
    return memPointer;
  } catch (e) {
    // TODO: Categorise errors better here
    setValue(err, -20, 'i32'); // Internal error catch-all for now
    setValue(length, 0, 'i32');
    return -1;
  }
})

// proc__get_pid(Error *err)
EM_JS(int, proc__get_pid, (Error * err), {
  setValue(err, 0, 'i32');
  return self.proc.pid;
})

// proc__get_redirect_in(Error *err)
EM_JS(char *, proc__get_redirect_in, (Error * err), {
  const ptr = stringToNewUTF8(self.proc.redirectStdin ?? "");
  setValue(err, 0, 'i32');
  return ptr;
})

// proc__get_redirect_out(Error *err)
EM_JS(char *, proc__get_redirect_out, (Error * err), {
  const ptr = stringToNewUTF8(self.proc.redirectStdout ?? "");
  setValue(err, 0, 'i32');
  return ptr;
})

// proc__pipe(int out_pid, int in_pid, Error *err)
EM_JS(void, proc__pipe, (int out_pid, int in_pid, Error *err), {
  let errCode = self.proc.pipe(out_pid, in_pid);
  setValue(err, errCode, 'i32'); // Forward error from JS
})

// proc__is_stdin_pipe(Error *err)
EM_JS(bool, proc__is_stdin_pipe, (Error * err), {
  setValue(err, 0, 'i32');
  return self.proc.isPipeable(self.proc.StreamDescriptor.STDIN);
})

// proc__is_stdout_pipe(Error *err)
EM_JS(bool, proc__is_stdout_pipe, (Error * err), {
  setValue(err, 0, 'i32');
  return self.proc.isPipeable(self.proc.StreamDescriptor.STDOUT);
})

int proc__input(char *restrict buf, int max_bytes, Error *restrict err) {
  // Short-circuit evaluation as to where we take input
  //  1. File
  //  2. Pipe
  //  3. Stdin

  // Check and take from file
  char *file_redirect = proc__get_redirect_in(err);
  if (file_redirect[0] != '\0') {
    int fd = file__open(file_redirect, O_RDONLY, err);
    if (fd == -1)
      return -1;
    ReadResult rr;
    file__read(fd, max_bytes, &rr, err);
    file__close(fd, err);
    memcpy(buf, rr.data, rr.size);
    free(rr.data);
    return rr.size;
  }

  // Check and take from pipe
  if (proc__is_stdin_pipe(err)) {
    if (*err < 0) {
      return -1;
    }
    return proc__input_pipe(buf, max_bytes, err);
  }

  // Take from stdin
  size_t bytesRead = fread(buf, 1, max_bytes - 1, stdin);
  if (ferror(stdin)) {
    *err = -14; // failed to read stdin (errors.c)
    return -1;
  }

  buf[bytesRead] = '\0';
  *err = 0;
  return (int)bytesRead;
}

// NOT USED
int proc__input_exact(char *restrict buf, int exact_bytes,
                      Error *restrict err) {
  // Short-circuit evaluation as to where we take input
  //  1. File
  //  2. Pipe
  //  3. Stdin

  // Check and take from file redirection
  char *file_redirect = proc__get_redirect_in(err);
  if (file_redirect[0] != '\0') {
    int fd = file__open(file_redirect, O_RDONLY, err);
    if (fd == -1)
      return -1;
    // file__read_exact()
    printf("NOT YET IMPLEMENTED FOR INPUT_EXACT!");
    return 0;
  }

  // Check and take from pipe
  if (proc__is_stdin_pipe(err)) {
    if (*err < 0) {
      printf("FAIL\n");
      return -1;
    }
    return proc__input_exact_pipe(buf, exact_bytes, err);
  }

  // Handle from stdin

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
  // Short-circuit evaluation as to where we take input
  //  1. File
  //  2. Pipe
  //  3. Stdin

  // Check and take from file
  char *file_redirect = proc__get_redirect_in(err);
  if (file_redirect[0] != '\0') {
    int fd = file__open(file_redirect, O_RDONLY, err);
    if (fd == -1)
      return NULL;
    ReadResult rr;
    file__read_all(fd, &rr, err);
    file__close(fd, err);
    return rr.data;
  }

  // Check and take from pipe
  if (proc__is_stdin_pipe(err)) {
    if (*err != 0) {
      return NULL;
    }
    return proc__input_all_pipe(err);
  }

  // Take input from stdin

  // Initial size
  size_t capacity = 1024;
  size_t length = 0;
  char *buffer = malloc(capacity);
  if (!buffer) {
    *err = -18; // Failed to assign memory (errors.c)
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
        *err = -18; // Failed to assign memory (errors.c)
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
  // Short-circuit evaluation as to where we take input
  //  1. File
  //  2. Pipe
  //  3. Stdin

  // Check and handle file redirection
  char *file_redirect = proc__get_redirect_in(err);
  if (file_redirect[0] != '\0') {
    int fd = file__open(file_redirect, O_RDONLY, err);
    if (fd == -1)
      return NULL;
    ReadResult rr;
    file__read_line(fd, &rr, err);
    file__close(fd, err);
    return rr.data;
  }

  // Check and handle pipe redirection
  if (proc__is_stdin_pipe(err)) {
    if (*err != 0) {
      return NULL;
    }
    return proc__input_line_pipe(err);
  }

  // Take input from stdin
  size_t n = 0;
  char *lineptr = NULL;
  if (getline(&lineptr, &n, stdin) == -1 && ferror(stdin)) {
    *err = -14; // Failed to read stdin (errors.c)
    return NULL;
  }

  *err = 0;
  return lineptr;
}

int _redir_fd = -1;
char *_redir_name;

void proc__output(const char *restrict buf, int len, Error *restrict err) {
  // Short-circuit evaluation as to where we direct output
  //  1. File
  //  2. Pipe
  //  3. Stdout


  if (_redir_name == NULL) {
    _redir_name = proc__get_redirect_out(err);
    if (_redir_name[0] != '\0') {
      _redir_fd = file__open(_redir_name, O_CREAT | O_WRONLY, err);
      if (_redir_fd == -1 && *err == E_EXISTS) {
        _redir_fd = file__open(_redir_name, O_WRONLY, err);
      }
      if (_redir_fd == -1) return;
    }
  }

  if (_redir_fd != -1) {
    file__write(_redir_fd, buf, err);
    return;
  }

  // Check if it's a pipe
  if (proc__is_stdout_pipe(err)) {
    if (*err != 0) {
      return;
    }
    proc__output_pipe(buf, len, err);
    return;
  }

  // Write to stdout
  int num_written = fwrite(buf, 1, len, stdout);
  if (num_written < len) {
    *err = -13; // Failed to write to stdout (errors.c)
    return;
  }
  fflush(stdout);
  *err = 0;
}

// void proc__start(int pid, Error *err)
EM_JS(void, proc__start, (int pid, Error *err), {
  let errCode = self.proc.start(pid);
  setValue(err, errCode, 'i32'); // Forward error from js
})

// const char *proc__get_lua_code(char *buf, int len, Error *err)
EM_JS(char *, proc__get_lua_code, (Error * err), {
  const ptr = stringToNewUTF8(self.proc.luaCode);
  if (!ptr) {
    setValue(err, -18, 'i32'); // Failed to assign memory (errors.c)
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
EM_JS(void, proc__args,
      (int *restrict argc, char *restrict **argv, Error *restrict err), {
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
