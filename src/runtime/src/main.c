#include <lua.h>
#include <lualib.h>
#include <lauxlib.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>

#include "../../filesystem/src/main.h"
#include "../../processes/c/processes.h"

#include "lib.h"

typedef struct {
  char data[8];
} u64;

void export_custom_apis(lua_State *L) {
  int top = lua_gettop(L);

  luaL_newlib(L, file_module);
  lua_setglobal(L, FILE_MODULE_NAME);
  luaL_newlib(L, errors_module);
  lua_setglobal(L, ERRORS_MODULE_NAME);
  luaL_newlib(L, process_module);
  lua_setglobal(L, PROCESS_MODULE_NAME);

  const Namespaced_Function* it = globals;
  while (it->namespace != NULL) {
    lua_getglobal(L, it->namespace);
    lua_getfield(L, -1, it->function);
    lua_setglobal(L, it->function);
    lua_pop(L, 1); // pop global we pushed onto stack
    it++;
  }

  lua_settop(L, top); // restore stack
}

// Removes the builtin global io functions
static const char *excluded_globals[] = {"print", "dofile", "load", "loadfile"};
void exclude_globals(lua_State *L) {
  for (size_t i = 0; i < sizeof(excluded_globals) / sizeof(const char *); i++) {
    lua_pushnil(L);
    lua_setglobal(L, excluded_globals[i]);
  }
}

int main(void) {
  lua_State *L = luaL_newstate();

  // We want to have control over what builtin
  // lua functions we expose, so we very clearly
  // only expose those that are not platform dependant
  luaL_requiref(L, LUA_STRLIBNAME, luaopen_string, 1);
  luaL_requiref(L, LUA_TABLIBNAME, luaopen_table, 1);
  luaL_requiref(L, LUA_MATHLIBNAME, luaopen_math, 1);
  luaL_requiref(L, LUA_GNAME, luaopen_base, 1);
  exclude_globals(L);

  export_custom_apis(L);

  Error err;

<<<<<<< HEAD
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

  free(luaCodeBuffer);
  fflush(stdout);

  proc__kill(current_pid, &err);

  lua_close(L);
  return 0;
}
