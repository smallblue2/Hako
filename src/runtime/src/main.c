#include <lua.h>
#include <lualib.h>
#include <lauxlib.h>
#include <stddef.h>
#include <stdio.h>

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

  char luaCodeBuffer[256];
  proc__get_lua_code(luaCodeBuffer, sizeof(luaCodeBuffer), &err);
  if (err < 0) {
    printf("Failed to load code from FS. Err: %d\n", err);
  }
  printf("Loaded code from FS: \n%s\n", luaCodeBuffer);

  char src[256];
  snprintf(src, sizeof(src),
      "local src = [[ %s ]]\n"
      "local func, ok = load(src)\n"
      "local success, err = pcall(func)\n"
      "if not success then\n"
      "  print(err)\n"
      "end", luaCodeBuffer);

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
