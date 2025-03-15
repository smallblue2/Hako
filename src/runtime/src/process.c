#include "process.h"
#include "lauxlib.h"
#include "lua.h"
#include "shared.h"
#include "unistd.h"
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
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

int lprocess__kill(lua_State *L) {
  int pid = luaL_checknumber(L, 1);
  Error err = 0;
  proc__kill(pid, &err);
  if (err != 0) {
    lua_pushnumber(L, err);
    return 1;
  }
  lua_pushnil(L);
  return 1;
}

int lprocess__get_pid(lua_State *L) {
  Error err = 0;
  int pid = proc__get_pid(&err);
  if (err != 0) {
    lua_pushnil(L);
    lua_pushnumber(L, err);
    return 2;
  }
  lua_pushnumber(L, pid);
  lua_pushnil(L);
  return 2;
}

// Process *proc__list(int *length, Error *err);
int lprocess__list(lua_State *L) {
  int len = 0; 
  Error err = 0;
  Process *list = proc__list(&len, &err);
  if (err != 0) {
    lua_pushnil(L);
    lua_pushnumber(L, err);
    return 2;
  }

  lua_newtable(L);
  for (int i = 1; i <= len; i++) {
    Process p = list[i - 1]; // 1 indexed lua bs :sigh:
    lua_pushnumber(L, i); // the index into the returned list

    lua_newtable(L); // the value to assign
    lua_pushnumber(L, p.pid);
    lua_setfield(L, -2, "pid");
    lua_pushnumber(L, p.alive);
    lua_setfield(L, -2, "alive");
    lua_pushnumber(L, p.created);
    lua_setfield(L, -2, "created");
    switch (p.state) {
      case READY:
        lua_pushstring(L, "ready");
        break;
      case RUNNING:
        lua_pushstring(L, "running");
        break;
      case SLEEPING:
        lua_pushstring(L, "sleeping");
        break;
      case TERMINATING:
        lua_pushstring(L, "terminating");
        break;
      case STARTING:
        lua_pushstring(L, "starting");
        break;
      default:
        lua_pushstring(L, "invalid");
    }
    lua_setfield(L, -2, "state");
    lua_settable(L, -3);
  }

  if (list != NULL) free(list); // sanity check as freeing NULL is UB

  lua_pushnil(L);
  return 2;
}

int lprocess__pipe(lua_State *L) {
  int out_pid = luaL_checknumber(L, 1);
  int in_pid = luaL_checknumber(L, 2);
  Error err = 0;
  proc__pipe(out_pid, in_pid, &err);
  if (err != 0) {
    lua_pushnumber(L, err);
    return 1;
  }
  lua_pushnil(L);
  return 1;
}

int lprocess__isatty(lua_State *L) {
  int stream = luaL_checknumber(L, 1);
  bool res = false;

  Error err = 0;
  if (stream == STDIN_FILENO) {
    res = !proc__is_stdin_pipe(&err); // being piped means not a tty
  } else if (stream == STDOUT_FILENO) {
    res = !proc__is_stdout_pipe(&err);
  } else {
    luaL_error(L, "Invalid argument %d: this function only accepts STDIN and STDOUT variables", stream);
    assert(false); // unreachable
  }

  if (err != 0) {
    lua_pushnil(L);
    lua_pushnumber(L, err);
    return 2;
  }

  lua_pushboolean(L, res);
  lua_pushnil(L);
  return 2;
}

// +1 for sentinal '\0'
static char input_buf[BUFSIZ + 1] = {0};

int lprocess__input(lua_State *L) {
  Error err = 0;
  int input_read = proc__input(input_buf, BUFSIZ, &err);
  if (err != 0) {
    lua_pushnil(L);
    lua_pushnumber(L, err);
    return 2;
  }
  input_buf[input_read] = '\0';
  lua_pushstring(L, input_buf);
  lua_pushnil(L);
  return 2;
}

// int proc__input_all(char *buf, int len, Error *err);
// int proc__input_line(char *buf, int len, Error *err);
