#include <errno.h>
#include <emscripten.h>
#include <fcntl.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <unistd.h>

#include "processes.h"


// // proc__input_pipe(char* buf, int len, Error *err)
// EM_JS(int, proc__input_pipe, (char *buf, int len, Error *err), {
//   let s = self.proc.input(len);
//   stringToUTF8(s, buf, len);
//   setValue(err, 0, 'i32');
//   return s.length;
// })
//
// // proc__input_all_pipe(char* buf, int len, Error *err)
// EM_JS(char *, proc__input_all_pipe, (Error *err), {
//   var s = self.proc.inputAll();
//   setValue(err, 0, 'i32');
//   return stringToNewUTF8(s)
// })
//
// // proc__input_line_pipe(char* buf, int len, Error *err)
// EM_JS(int, proc__input_line_pipe, (char *buf, int len, Error *err), {
//   var s = self.proc.inputLine();
//   stringToUTF8(s, buf, len);
//   setValue(err, 0, 'i32');
//   return s.length;
// })

// proc__output_pipe(char* buf, int len, Error *err)
EM_JS(void, proc__output_pipe, (const char *buf, int len, Error *err), {
  var s = UTF8ToString(buf, len);
  self.proc.output(s);
  setValue(err, 0, 'i32');
})

// proc__error_pipe(char* buf, int len, Error *err)
EM_JS(int, proc__error_pipe, (const char *buf, int len, Error *err), {
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
EM_JS(int, proc__create, (const char *buf, int len, bool pipe_stdin, bool pipe_stdout, Error *err), {
  var luaPath = UTF8ToString(buf, len);
  var createdPID = self.proc.create(luaPath, pipe_stdin, pipe_stdout);
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

// proc__list(Error *err)
EM_JS(Process*, proc__list, (int *length, Error *err), {
  try {
    let procJSON = self.proc.list();
    let heapAllocationSize = procJSON.length * 16; // C 'Process' struct is 16 bytes long
    // WARNING: NEEDS TO BE FREED IN C
    let memPointer = _malloc(heapAllocationSize);
    procJSON.forEach((item, index) => {
      const off = index * 16;
      setValue(memPointer + off, item.pid, 'i32');
      setValue(memPointer + off + 4, item.alive, 'i32');
      setValue(memPointer + off + 8, item.created, 'i32');
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
EM_JS(bool, proc__is_stdout_pipe, (Error* err), {
  setValue(err, 0, 'i32');
  return self.proc.isPipeable(self.proc.StreamDescriptor.STDOUT);
})

// int proc__input(char *buf, int len, Error *err) {
//   if (proc__is_stdin_pipe(err)) {
//     if (*err < 0) {
//       printf("FAIL\n");
//       return -1;
//     }
//     return proc__input_pipe(buf, len, err);
//   }
//   int bytesRead = fread(buf, 1, len - 1, stdin);
//   // TODO: Maybe perform length checks here for edge case where len > buf size
//   buf[bytesRead] = '\0';
//   return bytesRead;
// }
//
// char *proc__input_all(Error *err) {
//   if (proc__is_stdin_pipe(err)) {
//     if (*err != 0) {
//       printf("FAIL\n");
//       return -1;
//     }
//     return proc__input_all_pipe(buf, len, err);
//   }
//   int flags = fcntl(STDIN_FILENO, F_GETFL, 0);
//   fcntl(STDIN_FILENO, F_SETFL, flags | O_NONBLOCK);
//
//   // Attempt to read up to BUFFER_SIZE bytes
//   int bytesRead = read(STDIN_FILENO, buf, len - 1);
//   if (bytesRead > 0) {
//     buf[bytesRead] = '\0';
//   } else if (bytesRead == -1 && errno == EAGAIN) {
//     // Nothing in stdin
//     buf[0] = '\0';
//   } else {
//     // Read failed
//     *err = -12; // Stdin is empty (processes.js/js/common.js)
//     return -1;
//   }
//
//   *err = 0;
//   return bytesRead;
// }
//
// int proc__input_line(char *buf, int len, Error *err) {
//   if (proc__is_stdin_pipe(err)) {
//     if (*err != 0) {
//       printf("FAIL\n");
//       return -1;
//     }
//     return proc__input_line_pipe(buf, len, err);
//   }
//
//   if (fgets(buf, len, stdin) == NULL) {
//     // line read failed
//     *err = -14; // Failed to read stdin (processes.js/js/common.js)
//     return -1;
//   }
//
//   *err = 0;
//   return strlen(buf);
// }

void proc__output(const char *buf, int len, Error *err) {
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
EM_JS(void, proc__args, (int *argc, char ***argv, Error *err), {
  const jsArgs = self.proc.args;

  // Set argc
  const length = jsArgs.length;
  setValue(argc, length, 'i32');


  // Set argv
  let argvPointer = _malloc((length + 1) * 4); // Emscripten is 32-bit (4 bit pointer)
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
