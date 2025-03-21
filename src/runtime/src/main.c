#include <assert.h>
#include <lua.h>
#include <lualib.h>
#include <stddef.h>
#include <stdio.h>

#include "../../filesystem/src/main.h"
#include "../../processes/c/processes.h"

#include "lauxlib.h"
#include "lib.h"
#include <unistd.h>

void newlib(lua_State *L, const luaL_Reg *registry) {
  luaL_checkversion(L);
  int len;
  for (len = 0; registry[len].name != NULL; len++);
  lua_createtable(L, 0, len);
  luaL_setfuncs(L, registry, 0);
}

void export_custom_apis(lua_State *L) {
  int top = lua_gettop(L);

  for (int i = 0; custom_modules[i].name != NULL; i++) {
    newlib(L, custom_modules[i].registry);
    lua_setglobal(L, custom_modules[i].name);
  }

  const Namespaced_Function* it = globals;
  while (it->namespace != NULL) {
    lua_getglobal(L, it->namespace);
    lua_getfield(L, -1, it->function);
    lua_setglobal(L, it->function);
    lua_pop(L, 1); // pop global we pushed onto stack
    it++;
  }

  // Set number globals
  lua_pushnumber(L, STDIN_FILENO);
  lua_setglobal(L, "STDIN");
  lua_pushnumber(L, STDOUT_FILENO);
  lua_setglobal(L, "STDOUT");

  lua_pushnumber(L, 0);
  lua_setglobal(L, "FILE");
  lua_pushnumber(L, 1);
  lua_setglobal(L, "DIRECTORY");

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

void set_argv(lua_State *L) {
  Error err = 0;
  int argc;
  char **argv;
  proc__args(&argc, (char *restrict **)&argv, &err);
  assert(err == 0);

  // push the `process` module onto the top of the stack
  lua_getglobal(L, PROCESS_MODULE_NAME);
  assert(lua_istable(L, -1));

  lua_newtable(L); // table to store `argv`
  for (int i = 0; i < argc; i++) {
    const char *arg = argv[i];
    lua_pushnumber(L, i + 1);
    lua_pushstring(L, arg);
    lua_settable(L, -3);
  }
  lua_setfield(L, -2, "argv"); // set the `argv` field on global `process`

  lua_pop(L, -1); // pop `process` module
  free(argv);
}

void setup_fs(void) {
#ifdef __EMSCRIPTEN__
  MAIN_THREAD_EM_ASM({
    FS.mkdir("/persistent");
    try {
      FS.mount(PROXYFS, { root: "/persistent", fs: window._FSM.FS }, "/persistent");
    } catch (err) {
      console.error("[JS] Failed to mount proxy filesystem:", err);
    }

    FS.syncfs(
        true, function(err) {
          if (err) {
            console.error("[JS] Error during sync:", err);
          } else {
            console.log("[JS] Sync completed succesfully!");
          }
        });
  });
#endif
}

int main(void) {
  lua_State *L = luaL_newstate();

  setup_fs();

  // We want to have control over what builtin
  // lua functions we expose, so we very clearly
  // only expose those that are not platform dependant
  luaL_requiref(L, LUA_STRLIBNAME, luaopen_string, 1);
  luaL_requiref(L, LUA_TABLIBNAME, luaopen_table, 1);
  luaL_requiref(L, LUA_MATHLIBNAME, luaopen_math, 1);
  luaL_requiref(L, LUA_GNAME, luaopen_base, 1);

  exclude_globals(L);
  export_custom_apis(L);
  set_argv(L);

  // This loads third-party inspect module, to allow users to visualize lua data
  // structures more clearly
  if (luaL_dofile(L, "/static/inspect.lua") != LUA_OK) {
    fprintf(stderr, "Failed to load static module: %s\n", lua_tostring(L, -1));
  }
  lua_setglobal(L, "inspect");

  Error err;
  char *luaCodeBuffer = proc__get_lua_code(&err);
  if (err < 0) {
    fprintf(stderr, "Failed to load code from FS. Err: %d\n", err);
  }

  int current_pid = proc__get_pid(&err);
  assert(err == 0);

  if (luaL_loadstring(L, luaCodeBuffer) == LUA_OK) {
    if (lua_pcall(L, 0, 0, 0) == LUA_OK) {
      lua_pop(L, lua_gettop(L));
    } else {
      const char *err = lua_tostring(L, -1);
      fprintf(stderr, "Process failed: %s\n", err);
    }
  } else {
    const char *err = lua_tostring(L, -1);
    fprintf(stderr, "Process failed: %s\n", err);
  }

  free(luaCodeBuffer);
  fflush(stdout);

  proc__kill(current_pid, &err);

  lua_close(L);
  return 0;
}
