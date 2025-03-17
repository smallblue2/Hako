#include "errors.h"
#include "lauxlib.h"
#include "lua.h"
#include <stdio.h>

const char *str_of_errno(int errno_) {
  static char unknown_error[32];
  switch (errno_) {
    case 1:
      return "File exists";
    case 2:
      return "No such file or directory";
    case 3:
      return "Operation not permitted";
    case 4:
      return "Bad file descriptor";
    case 5:
      return "Protected system file";
    case 6:
      return "Is a directory";
    case 7:
      return "Not a directory";
    case 8:
      return "I/O error";
    case 9:
      return "Invalid argument";
    case 10:
      return "Resource temporarily unavailable (EAGAIN)";
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
