#include "process.h"
#include "lauxlib.h"
#include "lua.h"
#include "shared.h"
#include "unistd.h"
#include <assert.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "../processes/c/processes.h"
#include "../../filesystem/src/main.h"

typedef struct {
  bool pipe_in;
  bool pipe_out;
  char *redirect_in;
  char *redirect_out;
  const char **args;
  int args_len;
} process__create_opts;

int lprocess__create(lua_State *L) {
  const char *path = luaL_checkstring(L, 1);

  char *opath = fake_path(path);
  if (opath == NULL) {
    lua_pushnumber(L, E_DOESNTEXIST);
    return 1;
  }

  process__create_opts opts = {
    .pipe_in = false,
    .pipe_out = false,
    .redirect_in = NULL,
    .redirect_out = NULL,
    .args = NULL,
    .args_len = 0,
  };

  if (lua_istable(L, 2)) {
    lua_getfield(L, 2, "pipe_in");
    if (lua_isnil(L, -1)) lua_pop(L, 1);
    else {
      opts.pipe_in = checkboolean(L, -1);
    }

    lua_getfield(L, 2, "pipe_out");
    if (lua_isnil(L, -1)) lua_pop(L, 1);
    else {
      opts.pipe_out = checkboolean(L, -1);
    }

    lua_getfield(L, 2, "redirect_in");
    if (lua_isnil(L, -1)) lua_pop(L, 1);
    else {
      opts.redirect_in = fake_path(luaL_checkstring(L, -1));
      if (opts.redirect_in == NULL) {
        luaL_error(L, "Failed to create path for redirect_in");
        return 0;
      }
    }

    lua_getfield(L, 2, "redirect_out");
    if (lua_isnil(L, -1)) lua_pop(L, 1);
    else {
      opts.redirect_out = fake_path(luaL_checkstring(L, -1));
      if (opts.redirect_out == NULL) {
        luaL_error(L, "Failed to create path for redirect_out");
        return 0;
      }
    }

    lua_getfield(L, 2, "argv");
    if (lua_isnil(L, -1)) lua_pop(L, 1);
    else {
      luaL_checktype(L, -1, LUA_TTABLE); // ensure argv is a table

      lua_Integer len = luaL_len(L, -1);
      assert(len <= INT_MAX); // the below cast should not narrow

      opts.args_len = (int)len;
      opts.args = malloc(sizeof(char *) * len);
      if (opts.args == NULL) {
        luaL_error(L, "out of memory");
        return 0;
      }

      for (lua_Integer li = 1; li <= len; li++) {
        lua_rawgeti(L, -1, li);
        opts.args[li - 1] = luaL_checkstring(L, -1);
        lua_pop(L, 1);
      }
    }
  }

  // Get CWD and pass it to newly created process
  // (Implicit, user isn't aware of this)
  Error err = 0;
  char *cwd = file__cwd(&err);
  if (err != 0) {
    lua_pushnil(L);
    lua_pushnumber(L, err);
    return 2;
  }

  int len = strlen(opath);
  int pid = proc__create(opath, len, opts.args, opts.args_len, opts.pipe_in, opts.pipe_out, opts.redirect_in, opts.redirect_out, cwd, &err);
  free(opath);
  if (opts.redirect_in != NULL) free(opts.redirect_in);
  if (opts.redirect_out != NULL) free(opts.redirect_out);
  if (opts.args != NULL) free(opts.args);
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
  int exit_code = proc__wait(pid, &err);
  if (err != 0) {
    lua_pushnil(L);
    lua_pushnumber(L, err);
    return 2;
  }

  lua_pushnumber(L, exit_code);
  lua_pushnil(L);
  return 2;
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

int lprocess__exit(lua_State *L) {
  int exit_code = luaL_checknumber(L, 1);
  Error err = 0;
  proc__exit(exit_code, &err);
  if (err != 0) {
    lua_pushnumber(L, err);
    return 1;
  }
  lua_pushnil(L);
  return 1;
}

// NOTE: returns "" on EOF
int lprocess__input(lua_State *L) {
  static char stream_buf[BUFSIZ] = {0};

  Error err = 0;
  proc__input(stream_buf, BUFSIZ, &err);
  if (err != 0) {
    lua_pushnil(L);
    lua_pushnumber(L, err);
    return 2;
  }

  lua_pushstring(L, stream_buf);
  lua_pushnil(L);
  return 2;
}

int lprocess__input_all(lua_State *L) {
  Error err = 0;
  char *read_bytes = proc__input_all(&err);
  if (err != 0) {
    lua_pushnil(L);
    lua_pushnumber(L, err);
    return 2;
  }
  lua_pushstring(L, read_bytes);
  lua_pushnil(L);
  free(read_bytes);
  return 2;
}

int lprocess__input_line(lua_State *L) {
  Error err = 0;
  char *read_bytes = proc__input_line(&err);
  if (err != 0) {
    lua_pushnil(L);
    lua_pushnumber(L, err);
    return 2;
  }
  lua_pushstring(L, read_bytes);
  lua_pushnil(L);
  free(read_bytes);
  return 2;
}

int lprocess__close_input(lua_State *L) {
  Error err = 0;
  proc__close_input(&err);
  if (err != 0) {
    lua_pushnumber(L, err);
    return 1;
  }
  lua_pushnil(L);
  return 1;
}

int lprocess__close_output(lua_State *L) {
  Error err = 0;
  proc__close_output(&err);
  if (err != 0) {
    lua_pushnumber(L, err);
    return 1;
  }
  lua_pushnil(L);
  return 1;
}
