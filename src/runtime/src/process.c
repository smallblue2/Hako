#include "process.h"
#include "lauxlib.h"
#include "lua.h"
#include "shared.h"
#include <string.h>

typedef struct {
  bool pipe_in;
  bool pipe_out;
} process__create_opts;

int lprocess__create(lua_State *L) {
  lua_settop(L, 2);
  const char *path = luaL_checkstring(L, 1);

  process__create_opts opts = {
    .pipe_in = false,
    .pipe_out = false,
  };

  if (lua_istable(L, 2)) {
    lua_getfield(L, 2, "pipe_in");
    opts.pipe_in = checkboolean(L, -1);
    lua_getfield(L, 2, "pipe_out");
    opts.pipe_out = checkboolean(L, -1);
  }

  Error err = 0;
  int len = strlen(path);
  int pid = proc__create(path, len, opts.pipe_in, opts.pipe_out, &err);
  if (err != 0) {
    lua_pushnil(L);
    lua_pushnumber(L, err);
    return 2;
  }

  lua_pushnumber(L, pid);
  lua_pushnil(L);
  return 2;
}

int lprocess__start(lua_State *L) {
  lua_settop(L, 1);
  int pid = luaL_checknumber(L, 1);

  Error err = 0;
  proc__start(pid, &err);

  if (err != 0) {
    lua_pushnumber(L, err);
    return 1;
  }

  lua_pushnil(L);
  return 1;
}

int lprocess__wait(lua_State *L) {
  lua_settop(L, 1);
  int pid = luaL_checknumber(L, 1);

  Error err = 0;
  proc__wait(pid, &err);

  if (err != 0) {
    lua_pushnumber(L, err);
    return 1;
  }

  lua_pushnil(L);
  return 1;
}

typedef struct {
  bool newline;
} process__output_opts;

int lprocess__output(lua_State *L) {
  const char *to_output = luaL_checkstring(L, 1);

  process__output_opts opts = {
    .newline = true,
  };

  if (lua_istable(L, 2)) {
    lua_getfield(L, 2, "newline");
    opts.newline = checkboolean(L, -1);
    lua_pop(L, 2); // pop the boolean and the options table
                   // this leaves us with just the string to output
  }

  if (opts.newline) {
    lua_pushstring(L, "\n");
    lua_concat(L, 2);
  }

  to_output = luaL_checkstring(L, -1);
  int len = strlen(to_output);

  Error err = 0;
  proc__output(to_output, len, &err);

  if (err != 0) {
    lua_pushnumber(L, err);
    return 1;
  }

  lua_pushnil(L);
  return 1;
}
