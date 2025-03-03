#include <lua.h>
#include <lualib.h>
#include <lauxlib.h>
#include <stddef.h>

#include "../../filesystem/src/main.h"
#include "../../processes/c/processes.h"

#include "lib.h"

void export_stdlib(lua_State *L) {
  luaL_newlib(L, file_module);
  lua_setglobal(L, "file");
  luaL_newlib(L, errors_module);
  lua_setglobal(L, "errors");
}

int main(void) {
  lua_State *L = luaL_newstate();
  luaL_openlibs(L);

  Error err;
  char sourceCode[256];
  int pid = proc__create(sourceCode, 0, &err);
  printf("created: %d\n", pid);

  char *src =
    "local func, ok = load(io.read('*a'))\n"
    "local success, err = pcall(func)\n"
    "if not success then\n"
    "  print(err)\n"
    "end";

  file__initialiseFS();

  export_stdlib(L);

  if (luaL_loadstring(L, src) == LUA_OK) {
    if (lua_pcall(L, 0, 0, 0) == LUA_OK) {
      lua_pop(L, lua_gettop(L));
    } else {
      const char *err = lua_tostring(L, -1);
      printf("BOOTSTRAP PROCESS ERROR: %s\n", err);
    }
  } else {
    const char *err = lua_tostring(L, -1);
    printf("BOOTSTRAP PROCESS ERROR: %s\n", err);
  }

  fflush(stdout);

  lua_close(L);
  return 0;
}
