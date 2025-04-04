#include <assert.h>
#include <lua.h>
#include <lualib.h>
#include <stddef.h>
#include <stdio.h>

#include "../../filesystem/src/main.h"
#include "../../processes/c/processes.h"

#include "lauxlib.h"
#include "lib.h"
#include "stdlib.h"
#ifdef __EMSCRIPTEN__
#include "../vendor/libedit/src/editline/readline.h"
#endif
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
    const isNode = typeof window == "undefined";
    const _FSM = isNode ? globalThis._FSM : window._FSM;

    FS.mkdir("/persistent");
    try {
      FS.mount(PROXYFS, { root: "/persistent", fs: _FSM.FS }, "/persistent");
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

    FS.chdir("/persistent");
  });
#endif
}

int setup_env(void) {
  // CWD
  #ifdef __EMSCRIPTEN__
  char *cwd = EM_ASM_PTR({
    return stringToNewUTF8(self.proc.cwd);
  });
  int err;
  file__change_dir(cwd, &err);
  free(cwd);
  if (err != 0) {
    fprintf(stderr, "Failed to setup process's working directory. Err: %d\n", err);
    proc__exit(-1, &err);
    return -1;
  }
  #endif
  return 0;
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
  luaL_requiref(L, LUA_DBLIBNAME, luaopen_debug, 1);

  exclude_globals(L);
  export_custom_apis(L);
  set_argv(L);

  // This loads third-party inspect module, to allow users to visualize lua data
  // structures more clearly
  if (luaL_dofile(L, "/static/inspect.lua") != LUA_OK) {
    fprintf(stderr, "Failed to load static module: %s\n", lua_tostring(L, -1));
  }
  lua_setglobal(L, "inspect");

  // We need to run this after reading static files, as we overrite the default
  // root mountpoint
  setup_fs();
  if (setup_env() == -1) return 0;

#ifdef __EMSCRIPTEN__
  setenv("TERMINFO", "/usr/share/terminfo", 1);
  setenv("TERM", "xterm-256color", 1);

  rl_readline_name = "lsh";

  stifle_history(10);
#endif

  Error err = 0;
  char *luaCodeBuffer = proc__get_lua_code(&err);
  if (err < 0) {
    fprintf(stderr, "Failed to load code from FS. Err: %d\n", err);
    proc__exit(1, &err);
    return 1;
  }

  if (luaL_loadstring(L, luaCodeBuffer) == LUA_OK) {
    if (lua_pcall(L, 0, 0, 0) == LUA_OK) {
      lua_pop(L, lua_gettop(L));
    } else {
      const char *err_ = lua_tostring(L, -1);
      fprintf(stderr, "Process failed: %s\n", err_);
      proc__exit(1, &err);
      return 1;
    }
  } else {
    const char *err_ = lua_tostring(L, -1);
    fprintf(stderr, "Process failed: %s\n", err_);
    proc__exit(1, &err);
    return 1;
  }

  free(luaCodeBuffer);
  fflush(stdout);

  lua_close(L);
  proc__exit(0, &err);

  return 0;
}
