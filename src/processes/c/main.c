#include <emscripten.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

EM_JS(int, get_stdin, (char* buf, int len), {
  var s = getStdIn();
  Module.stringToUTF8(s, buf, len);
  return s.length;
});

EM_JS(int, send_to_stdout, (char* buf, int len), {
  var s = Module.UTF8ToString(buf, len);
  sendToStdOut(s);
  return s.length;
});

EM_JS(void, log_message, (const char* msg), {
  self.postMessage({ type: "log", message: Module.UTF8ToString(msg)})
});

void test(void) {
  char buffer[256]; // Allocate a buffer in C
  int length = get_stdin(buffer, sizeof(buffer)); // Call JS, get input

  if (length > 0) {
    char outbuffer[256];
    sprintf(outbuffer, "Received: %s\n", buffer);
    send_to_stdout(outbuffer, strlen(outbuffer));
  } else {
    printf("Error");
  }
}
