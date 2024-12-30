#include <emscripten.h>
#include <stdio.h>

int main() {

  EM_ASM({
    console.log("Hello from javascript!");
  });

  int x = EM_ASM_INT({
    console.log("Javascript recieved", $0, ", incrementing and returning!");
    return $0 + 1;
  }, 68);


  printf("C received %d\n", x);

  return 0;
}
