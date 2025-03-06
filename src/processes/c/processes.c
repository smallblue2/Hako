#include <emscripten.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

#include "processes.h"

// proc__input(char* buf, int len, Error *err)
EM_JS(int, proc__input, (char* buf, int len, Error *err), {
  let s = self.proc.input(len);
  stringToUTF8(s, buf, len);
  setValue(err, 0, 'i32');
  return s.length;
})

// proc__inputAll(char* buf, int len, Error *err)
EM_JS(int, proc__inputAll, (char* buf, int len, Error *err), {
  var s = self.proc.inputAll();
  stringToUTF8(s, buf, len);
  setValue(err, 0, 'i32');
  return s.length;
})

// proc__inputLine(char* buf, int len, Error *err)
EM_JS(int, proc__inputLine, (char* buf, int len, Error *err), {
  var s = self.proc.inputLine();
  stringToUTF8(s, buf, len);
  setValue(err, 0, 'i32');
  return s.length;
})

// proc__output(char* buf, int len, Error *err)
EM_JS(int, proc__output, (char* buf, int len, Error *err), {
  var s = UTF8ToString(buf, len);
  self.proc.output(s);
  setValue(err, 0, 'i32');
  return s.length;
})

// proc__error(char* buf, int len, Error *err)
EM_JS(int, proc__error, (char* buf, int len, Error *err), {
  var s = UTF8ToString(buf, len);
  self.proc.error(s);
  setValue(err, 0, 'i32');
  return s.length;
})

// proc__wait(int pid, Error *err)
EM_JS(void, proc__wait, (int pid, Error *err), {
  self.proc.wait(pid);
  setValue(err, 0, 'i32');
})

// proc__create(char *buf, int len, int pipeStdin, int pipeStdout, Error *err)
EM_JS(int, proc__create, (char *buf, int len, bool pipeStdin, bool pipeStdout, Error *err), {
  var luaPath = UTF8ToString(buf, len);
  var createdPID = self.proc.create(luaPath, pipeStdin, pipeStdout);
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

EM_JS(Process*, proc__list, (Error* err), {
  try {
    let procJSON = self.proc.list();
    let heapAllocationSize = procJSON.length * 20; // C 'Process' struct is 16 bytes long
    // WARNING: NEEDS TO BE FREED IN C
    let memPointer = _malloc(heapAllocationSize);
    let offsetCounter = 0;
    procJSON.forEach((item, index) => {
    console.log(`Proc ${index}`);
      setValue(offsetCounter + memPointer, item.pid, 'i32');
      setValue(offsetCounter + memPointer + 4, item.alive, 'i32');
      setValue(offsetCounter + memPointer + 8, Number(BigInt(item.created) & 0xFFFFFFFFn), 'i32');
      setValue(offsetCounter + memPointer + 12, Number((BigInt(item.created) >> 32n) & 0xFFFFFFFFn), 'i32');
      setValue(offsetCounter + memPointer + 16, item.state, 'i32');
      offsetCounter = index * 20;
    });
    setValue(err, 0, 'i32');
    return memPointer;
  } catch (e) {
    setValue(err, -1, 'i32');
    return -1;
  }
})

EM_JS(int, proc__getPid, (Error* err), {
  setValue(err, 0, 'i32');
  return self.proc.pid;
})


void test(void) {
  Error err;

  char buffer[256]; // Allocate a buffer in C

  printf("Getting proc__list!\n");
  Process* proc_list = proc__list(&err);
  printf("Got proc__list!\n");

  printf("pid[0] -> %d\n", proc_list->pid);
  printf("created_low[0] -> %d\n", proc_list->created_low);
  printf("created_high[0] -> %d\n", proc_list->created_high);
  uint64_t created = proc_list->created_low | ((uint64_t)proc_list->created_high << 32);
  printf("created -> %lld\n", created);
  printf("alive[0] -> %d\n", proc_list->alive);
  printf("state[0] -> %d\n", proc_list->state);
  free(proc_list);
}
