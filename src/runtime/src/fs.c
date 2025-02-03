#include "../../filesystem/src/main.h"
#include "fs.h"
#include "fcntl.h"
#include "lauxlib.h"

// int file__open(const char *path, int flags, Error *err);

// Not in mainline lua, but adapted from: https://github.com/luau-lang/luau/pull/221
bool checkboolean(lua_State *L, int narg) {
  if (!lua_isboolean(L, narg)) {
    luaL_typeerror(L, narg, lua_typename(L, LUA_TBOOLEAN));
  }
  return lua_toboolean(L, narg);
}

int lfile__open(lua_State *L) {
  lua_settop(L, 3);

  const char *path = luaL_checkstring(L, 1);

  luaL_checktype(L, 2, LUA_TTABLE);

  // Unpack values of table onto the stack
  lua_getfield(L, 2, "read");
  lua_getfield(L, 2, "write");
  lua_getfield(L, 2, "create");

  bool read = checkboolean(L, -3);
  bool write = checkboolean(L, -2);
  bool create = checkboolean(L, -1);

  lua_pop(L, 3); // pop saved values from stack

  int flags = 0;
  if (read && write) flags |= O_RDWR;
  else if (read) flags |= O_RDONLY;
  else if (write) flags |=  O_WRONLY;
  if (create) flags |= O_CREAT;

  Error err;
  int fd = file__open(path, flags, &err);
  if (fd < 0) {
    fprintf(stderr, "Failed to open file: error %d\n", (int)err);
    return -1;
  }

  lua_pushnumber(L, fd);

  return 1;
}
