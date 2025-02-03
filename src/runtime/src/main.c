#include <lua.h>
#include <lualib.h>
#include <lauxlib.h>

#include "../filesystem/src/main.h"
#include "fs.h"

int main(void) {
  lua_State *L = luaL_newstate();
  luaL_openlibs(L);

  printf("Reading lua code from stdin ...\n");

  char *src =
    "local func, ok = load(io.read('*a'))\n"
    "pcall(func)";

  file__initialiseFS();

  for (size_t i = 0; i < sizeof(file_module_funcs) / sizeof(file_module_funcs[0]); i++) {
    lua_register(L, file_module_funcs[i].name, file_module_funcs[i].func);
  }

  if (luaL_loadstring(L, src) == LUA_OK) {
    if (lua_pcall(L, 0, 0, 0) == LUA_OK) {
      lua_pop(L, lua_gettop(L));
    } else {
      const char *err = lua_tostring(L, -1);
      printf("Running: %s\n", err);
    }
  } else {
    const char *err = lua_tostring(L, -1);
    printf("Loading: %s\n", err);
  }

  fflush(stdout);

  lua_close(L);
  return 0;
}
