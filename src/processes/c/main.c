#include <emscripten.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

typedef int Error;

// proc__input(char* buf, int len, Error *err)
EM_JS(int, proc__input, (char* buf, int len, Error *err), {
  try {
    var s = self.input(len);
    Module.stringToUTF8(s, buf, len);
    Module.setValue(err, 0, 'i32');
    return s.length;
  } catch (e) {
      Module.setValue(err, 1, 'i32');
      return -1;
    }
});

// proc__inputAll(char* buf, int len, Error *err)
EM_JS(int, proc__inputAll, (char* buf, int len, Error *err), {
  try {
    var s = self.inputAll();
    Module.stringToUTF8(s, buf, len);
    Module.setValue(err, 0, 'i32');
    return s.length;
  } catch (e) {
    Module.setValue(err, 1, 'i32');
    return -1;
  }
});

// proc__inputLine(char* buf, int len, Error *err)
EM_JS(int, proc__inputLine, (char* buf, int len, Error *err), {
  try {
    var s = self.inputLine();
    Module.stringToUTF8(s, buf, len);
    Module.setValue(err, 0, 'i32');
    return s.length;
  } catch (e) {
    Module.setValue(err, 1, 'i32');
    return -1;
  }
});

// proc__output(char* buf, int len, Error *err)
EM_JS(int, proc__output, (char* buf, int len, Error *err), {
  try {
    var s = Module.UTF8ToString(buf, len);
    self.output(s);
    Module.setValue(err, 0, 'i32');
    return s.length;
  } catch (e) {
    Module.setValue(err, 1, 'i32');
    return -1;
  }
});

// proc__error(char* buf, int len, Error *err)
EM_JS(int, proc__error, (char* buf, int len, Error *err), {
  try {
    var s = Module.UTF8ToString(buf, len);
    self.error(s);
    Module.setValue(err, 0, 'i32');
    return s.length;
  } catch (e) {
    Module.setValue(err, 1, 'i32');
    return -1;
  }
});

// proc__wait(int pid, Error *err)
EM_JS(void, proc__wait, (int pid, Error *err), {
  try {
    self.wait(pid);
    Module.setValue(err, 0, 'i32');
  } catch (e) {
    Module.setValue(err, 1, 'i32');
    return -1;
  }
});

// proc__create(char *buf, int len, Error *err)
EM_JS(int, proc__create, (char *buf, int len, Error *err), {
  try {
    var luaPath = Module.UTF8ToString(buf, len);
    var createdPID = self.create(luaPath);
    Module.setValue(err, 0, 'i32');
    return createdPID;
  } catch (e) {
    Module.setValue(err, 1, 'i32');
    return -1;
  }
});

// proc__kill(int pid)
EM_JS(void, proc__kill, (int pid, Error *err), {
  try {
    self.kill(pid);
    Module.setValue(err, 0, 'i32');
  } catch (e) {
    Module.setValue(err, 1, 'i32');
  }
});

typedef enum : int {
  READY,
  RUNNING,
  SLEEPING,
  TERMINATING
} ProcessStates;

typedef struct __attribute__((packed)) {
  int pid; // 0
  int alive; // 4
  int created_low; // 8
  int created_high; // 12
  ProcessStates state; // 16
} Process; // 20

EM_JS(Process*, proc__list, (), {
  try {
    Module.setValue(err, 0, 'i32');
    return self.list();
  } catch (e) {
    Module.setValue(err, 1, 'i32');
    return -1;
  }
});


void test(void) {
  Error err;

  char buffer[256]; // Allocate a buffer in C
  int length = proc__inputLine(buffer, sizeof(buffer), &err); // Call JS, get input

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

  int new_pid = proc__create("", 0, &err);


  printf("Spun up process: %d\n", new_pid);

  proc__kill(new_pid, &err);

  printf("Killed process: %d\n", new_pid);

  if (length > 0) {
    char outbuffer[256];
    sprintf(outbuffer, "Received: %s\n", buffer);
    proc__output(outbuffer, strlen(outbuffer), &err);
  } else {
    printf("Error");
  }
}
