#include <emscripten.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

// proc__input(char* buf, int len)
EM_JS(int, proc__input, (char* buf, int len), {
  var s = self.input(len);
  Module.stringToUTF8(s, buf, len);
  return s.length;
});

// proc__inputAll(char* buf, int len)
EM_JS(int, proc__inputAll, (char* buf, int len), {
  var s = self.inputAll();
  Module.stringToUTF8(s, buf, len);
  return s.length;
});

// proc__inputLine(char* buf, int len)
EM_JS(int, proc__inputLine, (char* buf, int len), {
  var s = self.inputLine();
  Module.stringToUTF8(s, buf, len);
  return s.length;
});

// proc__output(char* buf, int len)
EM_JS(int, proc__output, (char* buf, int len), {
  var s = Module.UTF8ToString(buf, len);
  self.output(s);
  return s.length;
});

// proc__error(char* buf, int len)
EM_JS(int, proc__error, (char* buf, int len), {
  var s = Module.UTF8ToString(buf, len);
  self.error(s);
  return s.length;
});

// proc__wait(int pid)
EM_JS(void, proc__wait, (int pid), {
  self.wait(pid);
});

// proc__create(char *buf, int len)
EM_JS(int, proc__create, (char *buf, int len), {
  var luaPath = Module.UTF8ToString(buf, len);
  var createdPID = self.create(luaPath);
  return createdPID;
});

// proc__kill(int pid)
EM_JS(void, proc__kill, (int pid), {
  self.kill(pid);
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
  long long created; // 8
  ProcessStates state; // 16
} Process; // 20

EM_JS(Process*, proc__list, (), {
  return self.list();
});


void test(void) {
  char buffer[256]; // Allocate a buffer in C
  int length = proc__inputLine(buffer, sizeof(buffer)); // Call JS, get input

  printf("Getting proc__list!\n");
  Process* proc_list = proc__list();
  printf("Got proc__list!\n");

  printf("pid[0] -> %d\n", proc_list->pid);
  printf("created[0] -> %lld\n", proc_list->created);
  printf("alive[0] -> %d\n", proc_list->alive);
  printf("state[0] -> %d\n", proc_list->state);
  free(proc_list);

  int new_pid = proc__create("", 0);


  printf("Spun up process: %d\n", new_pid);

  proc__kill(new_pid);

  printf("Killed process: %d\n", new_pid);

  if (length > 0) {
    char outbuffer[256];
    sprintf(outbuffer, "Received: %s\n", buffer);
    proc__output(outbuffer, strlen(outbuffer));
  } else {
    printf("Error");
  }
}
