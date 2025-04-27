#include "errors.h"
#include "lauxlib.h"
#include "lua.h"
#include "process.h"
#include "../processes/c/processes.h"
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>


const char *str_of_errno(int errno_) {
  static char unknown_error[32];
  switch (errno_) {
    case -1: return "Process doesn't have a registered worker";
    case -2: return "Process doesn't exist";
    case -3: return "Waiting process no longer exists";
    case -4: return "Process state doesn't exist";
    case -5: return "Tried to create PTY process without a PTY";
    case -6: return "No process to register a worker to";
    case -7: return "No available PIDs - Process table is full";
    case -8: return "External error";
    case -9: return "Unknown error";
    case -10: return "Process isn't set to pipe its stdout";
    case -11: return "Process isn't set to pipe its stdin";
    case -12: return "Stdin is empty";
    case -13: return "Failed to write to stdout";
    case -14: return "Failed to read stdin";
    case -15: return "Tried to pipe input into process that has already started";
    case -16: return "Lua file doesn't exist";
    case -17: return "Invalid arguments passed to process";
    case -18: return "Failed to assign memory";
    case -19: return "Reached EOF";
    case -20: return "Internal error";
    case 1: return "File exists";
    case 2: return "No such file or directory";
    case 3: return "Operation not permitted";
    case 4: return "Bad file descriptor";
    case 5: return "Protected system file";
    case 6: return "Is a directory";
    case 7: return "Not a directory";
    case 8: return "I/O error";
    case 9: return "Invalid argument";
    case 10: return "Resource temporarily unavailable (EAGAIN)";
    case 11: return "Directory is not empty";
    default:
      snprintf(unknown_error, 32, "Unknown error: %d", errno_);
      return unknown_error;
  }
}

int lerrors__as_string(lua_State *L) {
  lua_settop(L, 1);
  int errno_ = luaL_checknumber(L, 1);
  const char *msg = str_of_errno(errno_);
  lua_pushstring(L, msg);
  return 1;
}

int lerrors__ok(lua_State *L) {
  static char fmt_buf[1024] = {0};

  // Error was nil, just return
  if (lua_type(L, 1) == LUA_TNIL) {
    return 0;
  }

  int errcode = luaL_checknumber(L, 1);
  const char *msg = luaL_optstring(L, 2, "system error");
  const char *errmsg = str_of_errno(errcode);
  static const char delim[] = ": ";
  static const int delim_len = sizeof(delim) - 1;

  int formatted_size = strlen(msg) + delim_len + strlen(errmsg);
  int formatted_sizez = formatted_size + 1; // with null byte

  char *fmt = fmt_buf;
  bool buf_owned = formatted_sizez > (int)sizeof(fmt_buf);
  if (buf_owned) {
    fmt = malloc(formatted_sizez);
  }

  assert(formatted_size == snprintf(fmt, formatted_sizez, "%s%s%s", msg, delim, errmsg));

  lua_pushstring(L, fmt);
  if (buf_owned) {
    free(fmt);
  }

  lprocess__output(L);
  Error err = 0;
  proc__exit(1, &err);
  assert(err == 0);

  return 0;
}
