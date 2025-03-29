#include "terminal.h"
#include <assert.h>
#include <stdio.h>

int lterminal__clear(__attribute__((unused)) lua_State *L) {
  printf("\033[2J\033[H");
  fflush(stdout);
  return 0;
}
