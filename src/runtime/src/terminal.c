#include "terminal.h"
#include <assert.h>
#include <stdio.h>

int lterminal__clear(lua_State *_) {
  printf("\033[2J\033[H");
  fflush(stdout);
  return 0;
}
