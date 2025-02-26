#include <emscripten.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

EM_JS(int, get_stdin, (char* buf, int len), {
  var s = getStdin(); // Call a JavaScript function defined externally
  stringToUTF8(s, buf, len); // Copy the string into WebAssembly memory
  return s.length; // Return the length of the string
});

int main() {
  char buffer[256]; // Allocate a buffer in C
  int length = get_stdin(buffer, sizeof(buffer)); // Call JS, get input

  if (length > 0) {
    printf("Received from JS: %s\n", buffer);
  } else {
    printf("No input received!\n");
  }

  return 0;
}
