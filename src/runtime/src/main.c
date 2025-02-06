#include <lua.h>
#include <lualib.h>
#include <lauxlib.h>

#include "../filesystem/src/main.h"
#include "fs.h"

void export_stdlib(lua_State *L) {
  for (size_t modi = 0; modi < nmodules; modi++) {
    lua_pushglobaltable(L);
    for (size_t i = 0; i < stdlib_len[modi]; i++) {
      ModuleEntry ent = stdlib[modi][i];
      lua_pushcfunction(L, ent.func);
      lua_setfield(L, -2, ent.name);
    }
    lua_setglobal(L, stdlib_ns[modi]);
  }
}

int main(void) {
  lua_State *L = luaL_newstate();
  luaL_openlibs(L);

  char *src =
    "local func, ok = load(io.read('*a'))\n"
    "local success, err = pcall(func)\n"
    "if not success then\n"
    "  print(err)\n"
    "end";

  file__initialiseFS();

  export_stdlib(L);

  // lua_pushglobaltable(L);
  //
  // for (size_t i = 0; i < file_module_len; i++) {
  //   lua_pushcfunction(L, file_module[i].func);
  //   lua_setfield(L, -2, file_module[i].name);
  // }
  //
  // lua_setglobal(L, "file");

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
