#include "../../filesystem/src/main.h"
#include "file.h"
#include <fcntl.h>
#include <lauxlib.h>
#include <lua.h>
#include <time.h>
#include <errno.h>

// Not in mainline lua, but adapted from: https://github.com/luau-lang/luau/pull/221
bool checkboolean(lua_State *L, int narg) {
  if (!lua_isboolean(L, narg)) {
    luaL_typeerror(L, narg, lua_typename(L, LUA_TBOOLEAN));
  }
  return lua_toboolean(L, narg);
}

bool can_read_s(const char *flags) {
  return strchr(flags, 'r') != NULL;
}

bool can_write_s(const char *flags) {
  return strchr(flags, 'w') != NULL;
}

bool can_exec_s(const char *flags) {
  return strchr(flags, 'x') != NULL;
}

bool can_create_s(const char *flags) {
  return strchr(flags, 'c') != NULL;
}

/**
 * @@ file.open(path: string, flags: string) -> (fd: int | nil, err: number | nil)
 */
int lfile__open(lua_State *L) {
  lua_settop(L, 2);

  const char *path = luaL_checkstring(L, 1);
  const char *flagss = luaL_checkstring(L, 2);

  bool read = can_read_s(flagss);
  bool write = can_write_s(flagss);
  bool create = can_create_s(flagss);
 
  int flags = 0;
 
  if (read && write) flags |= O_RDWR;
  else if (read) flags |= O_RDONLY;
  else if (write) flags |=  O_WRONLY;
 
  if (create) flags |= O_CREAT;

  Error err = 0;
  int fd = file__open(path, flags, &err);
  if (fd < 0) {
    lua_pushnil(L);
    lua_pushnumber(L, err);
    return 2;
  }

  lua_pushnumber(L, fd);
  lua_pushnil(L);

  return 2;
}

/**
 * @@ file.close(fd: int) -> (err: number | nil)
 */
int lfile__close(lua_State *L) {
  lua_settop(L, 1);
  int fd = luaL_checknumber(L, 1);
  Error err;
  file__close(fd, &err);
  if (err != 0) {
    lua_pushnumber(L, errno);
    return 1;
  }
  lua_pushnil(L);
  return 1;
}

/**
 * @@ file.write(fd: int, text: string) -> (err: number | nil)
 */
int lfile__write(lua_State *L) {
  lua_settop(L, 2);
  int fd = luaL_checknumber(L, 1);
  const char *content = luaL_checkstring(L, 2);
  Error err;
  file__write(fd, content, &err);
  if (err != 0) {
    lua_pushnumber(L, errno);
    return 1;
  }

  lua_pushnil(L);
  return 1;
}

/**
 * @@ file.read(fd: int, amt: int) -> (read: string | nil, err: number | nil)
 */
int lfile__read(lua_State *L) {
  lua_settop(L, 2);
  int fd = luaL_checknumber(L, 1);
  int amt = luaL_checknumber(L, 2);
  ReadResult rr;
  Error err;
  file__read(fd, amt, &rr, &err);
  if (err != 0) {
    lua_pushnil(L);
    lua_pushnumber(L, errno);
    return 2;
  }
  lua_pushlstring(L, rr.data, rr.size);
  free(rr.data); // safe to free as lua does not own/borrow the memory
  lua_pushnil(L);
  return 2;
}

/**
 * @@ file.read_all(fd: int) -> (read: string | nil, err: number | nil)
 */
int lfile__read_all(lua_State *L) {
  lua_settop(L, 1);
  int fd = luaL_checknumber(L, 1);
  ReadResult rr;
  Error err;
  file__read_all(fd, &rr, &err);
  if (err != 0) {
    lua_pushnil(L);
    lua_pushnumber(L, errno);
    return 2;
  }
  lua_pushlstring(L, rr.data, rr.size);
  free(rr.data);
  lua_pushnil(L);
  return 2;
}

/**
 * @@ file.shift(fd: int, amt: int) -> (err: number | nil)
 */
int lfile__shift(lua_State *L) {
  lua_settop(L, 2);
  int fd = luaL_checknumber(L, 1);
  int amt = luaL_checknumber(L, 2);
  Error err;
  file__shift(fd, amt, &err);
  if (err != 0) {
    lua_pushnumber(L, errno);
    return 1;
  }
  lua_pushnil(L);
  return 1;
}

/**
 * @@ file.goto(fd: int, pos: int) -> (err: number | nil)
 */
int lfile__goto(lua_State *L) {
  lua_settop(L, 2);
  int fd = luaL_checknumber(L, 1);
  int pos = luaL_checknumber(L, 2);
  Error err;
  file__goto(fd, pos, &err);
  if (err != 0) {
    lua_pushnumber(L, errno);
    return 1;
  }
  lua_pushnil(L);
  return 1;
}

/**
 * @@ file.remove(path: string) -> (err: number | nil)
 */
int lfile__remove(lua_State *L) {
  lua_settop(L, 1);
  const char *path = luaL_checkstring(L, 1);
  Error err;
  file__remove(path, &err);
  if (err != 0) {
    lua_pushnumber(L, errno);
    return 1;
  }
  lua_pushnil(L);
  return 1;
}

/**
 * @@ file.move(old_path: string, new_path: string) -> (err: number | nil)
 */
int lfile__move(lua_State *L) {
  lua_settop(L, 2);
  const char *old_path = luaL_checkstring(L, 1);
  const char *new_path = luaL_checkstring(L, 2);
  Error err;
  file__move(old_path, new_path, &err);
  if (err != 0) {
    lua_pushnumber(L, errno);
    return 1;
  }
  lua_pushnil(L);
  return 1;
}

/**
 * @@ file.make_dir(dir_path: string) -> (err: number | nil)
 */
int lfile__make_dir(lua_State *L) {
  lua_settop(L, 1);
  const char *path = luaL_checkstring(L, 1);
  Error err;
  file__make_dir(path, &err);

  if (err != 0) {
    lua_pushnumber(L, errno);
    return 1;
  }
  lua_pushnil(L);
  return 1;
}

/**
 * @@ file.remove_dir(dir_path: string) -> (err: number | nil)
 */
int lfile__remove_dir(lua_State *L) {
  lua_settop(L, 1);
  const char *path = luaL_checkstring(L, 1);
  Error err;
  file__remove_dir(path, &err);
  if (err != 0) {
    lua_pushnumber(L, errno);
    return 1;
  }
  lua_pushnil(L);
  return 1;
}

/**
 * @@ file.change_dir(dir_path: string) -> (err: number | nil)
 */
int lfile__change_dir(lua_State *L) {
  lua_settop(L, 1);
  const char *path = luaL_checkstring(L, 1);
  Error err;
  file__change_dir(path, &err);
  if (err != 0) {
    lua_pushnumber(L, errno);
    return 1;
  }
  lua_pushnil(L);
  return 1;
}

/**
 * @@ file.read_dir(dir_path: string) -> (entries: string[], err: number | nil)
 */
int lfile__read_dir(lua_State *L) {
  lua_settop(L, 2);
  const char *path = luaL_checkstring(L, 1);

  Entry entry = {0};
  Error err = 0;
  lua_newtable(L);

  int idx = 1;
  file__read_dir(path, &entry, &err);

  do {
    lua_pushstring(L, entry.name);
    free(entry.name);
    entry.name = NULL;

    lua_pushinteger(L, idx);
    lua_insert(L, -2);
    lua_settable(L, -3);

    file__read_dir(path, &entry, &err);
    idx++;
  } while (!entry.isEnd && err == 0);

  if (err != 0) {
    lua_pop(L, 1);
    lua_pushnil(L);
    lua_pushnumber(L, errno);
    return 2;
  }

  lua_pushnil(L);
  return 2;
}

void statr_as_l(lua_State *L, StatResult *sr) {
  lua_createtable(L, 0, 8);

  lua_pushnumber(L, sr->size);
  lua_setfield(L, -2, "size");

  lua_pushnumber(L, sr->blocks);
  lua_setfield(L, -2, "blocks");

  lua_pushnumber(L, sr->blocksize);
  lua_setfield(L, -2, "blocksize");

  lua_pushnumber(L, sr->ino);
  lua_setfield(L, -2, "ino");

  int usr = (sr->perm & 0700) >> 6;
  bool read = (usr & 4) != 0;
  bool write = (usr & 2) != 0;
  bool exec = (usr & 1) != 0;

  char perm[4] = {0};
  int i = 0;
  if (read) perm[i++] = 'r';
  if (write) perm[i++] = 'w';
  if (exec) perm[i] = 'x';

  lua_pushstring(L, perm);
  lua_setfield(L, -2, "perm");

  // Fill up those time fields
  static const char *time_fields[] = { "atime", "mtime", "ctime" };
  static const size_t time_offsets[] = { offsetof(StatResult, atime), offsetof(StatResult, mtime), offsetof(StatResult, ctime) };

  for (size_t i = 0; i < sizeof(time_fields) / sizeof(time_fields[0]); i++) {
    lua_createtable(L, 0, 2);
    char *srr = (char *)sr; // we view the stat result as bytes
    Time *time = (Time *)(srr + time_offsets[i]); // then just extract the field by byte offset

    lua_pushnumber(L, time->sec);
    lua_setfield(L, -2, "sec");
    lua_pushnumber(L, time->nsec);
    lua_setfield(L, -2, "nsec");

    lua_setfield(L, -2, time_fields[i]);
  }

}

/**
 * @@ file.stat(path: string) -> (sr: StatResult | nil, err: number | nil)
 *
 * type StatResult {
 *   size: number,
 *   blocks: number,
 *   blocksize: number,
 *   ino: number,
 *   perm: number, -- permissions (Only user: 01 Read, 001 Write, 0001 Execute) 20
 * 
 *   atime: {
 *     sec: number,
 *     nsec: number,
 *   },
 *   mtime: {
 *     sec: number,
 *     nsec: number,
 *   },
 *   ctime: {
 *     sec: number,
 *     nsec: number,
 *   },
 * }
 *
 */
int lfile__stat(lua_State *L) {
  lua_settop(L, 1);
  const char *path = luaL_checkstring(L, 1);
  StatResult sr;
  Error err;
  file__stat(path, &sr, &err);
  if (err != 0) {
    lua_pushnil(L);
    lua_pushnumber(L, errno);
    return 2;
  }
  statr_as_l(L, &sr);
  lua_pushnil(L);
  return 2;
}

/**
 * @@ file.fdstat(fd: number) -> (sr: StatResult | nil, err: number | nil)
 *
 * type StatResult {
 *   size: number,
 *   blocks: number,
 *   blocksize: number,
 *   ino: number,
 *   perm: number, -- permissions (Only user: 01 Read, 001 Write, 0001 Execute) 20
 * 
 *   atime: {
 *     sec: number,
 *     nsec: number,
 *   },
 *   mtime: {
 *     sec: number,
 *     nsec: number,
 *   },
 *   ctime: {
 *     sec: number,
 *     nsec: number,
 *   },
 * }
 *
 */
int lfile__fdstat(lua_State *L) {
  lua_settop(L, 1);
  int fd = luaL_checknumber(L, 1);
  StatResult sr;
  Error err;
  file__fdstat(fd, &sr, &err);
  if (err != 0) {
    lua_pushnil(L);
    lua_pushnumber(L, errno);
    return 2;
  }
  statr_as_l(L, &sr);
  lua_pushnil(L);
  return 2;
}

/**
 * @@ file.permit(fd: number, flags: string) -> (err: number | nil)
 */
int lfile__permit(lua_State *L) {
  lua_settop(L, 2);

  const char *path = luaL_checkstring(L, 1);
  const char *flagss = luaL_checkstring(L, 2);

  bool read = can_read_s(flagss);
  bool write = can_write_s(flagss);
  bool exec = can_exec_s(flagss);

  int flags = 0;
  if (read) flags |= 0400;
  if (write) flags |= 0200;
  if (exec) flags |= 0100;

  Error err;
  file__permit(path, flags, &err);
  if (err != 0) {
    lua_pushnumber(L, errno);
    return 1;
  }

  lua_pushnil(L);
  return 1;
}
