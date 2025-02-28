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

EM_JS(void, proc__wait, (int pid), {
  self.wait(pid);
});

EM_JS(int, proc__create, (char *buf, int len), {
  var luaPath = Module.UTF8ToString(buf, len);
  var createdPID = self.create(luaPath);
  return createdPID;
});

void test(void) {
  char buffer[256]; // Allocate a buffer in C
  int length = proc__inputLine(buffer, sizeof(buffer)); // Call JS, get input

  int new_pid = proc__create("", 0);

  printf("Waiting on %d\n", new_pid);
  proc__wait(new_pid);
  printf("Finished waiting!\n");

  if (length > 0) {
    char outbuffer[256];
    sprintf(outbuffer, "Received: %s\n", buffer);
    proc__output(outbuffer, strlen(outbuffer));
  } else {
    printf("Error");
  }
}
