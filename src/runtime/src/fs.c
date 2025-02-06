#include "../../filesystem/src/main.h"
#include "fs.h"
#include "fcntl.h"
#include "lauxlib.h"
#include "lua.h"
#include <time.h>

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

  Error err;
  int fd = file__open(path, flags, &err);
  if (fd < 0) {
    fprintf(stderr, "Failed to open file: error %d\n", (int)err);
    return -1;
  }

  lua_pushnumber(L, fd);

  return 1;
}

int lfile__close(lua_State *L) {
  lua_settop(L, 1);
  int fd = luaL_checknumber(L, 1);
  Error err;
  file__close(fd, &err);
  if (err != 0) {
    fprintf(stderr, "Failed to open file: error %d\n", (int)err);
    return -1;
  }
  return 0;
}

int lfile__write(lua_State *L) {
  lua_settop(L, 2);
  int fd = luaL_checknumber(L, 1);
  const char *content = luaL_checkstring(L, 2);
  Error err;
  file__write(fd, content, &err);
  if (err != 0) {
    fprintf(stderr, "Failed to open file: error %d\n", (int)err);
    return -1;
  }
  return 0;
}

int lfile__read(lua_State *L) {
  lua_settop(L, 2);
  int fd = luaL_checknumber(L, 1);
  int amt = luaL_checknumber(L, 2);
  ReadResult rr;
  Error err;
  file__read(fd, amt, &rr, &err);
  if (err != 0) {
    fprintf(stderr, "Failed to open file: error %d\n", (int)err);
    return -1;
  }
  lua_pushlstring(L, rr.data, rr.size);
  free(rr.data); // safe to free as lua does not own/borrow the memory
  return 1;
}

int lfile__read_all(lua_State *L) {
  lua_settop(L, 1);
  int fd = luaL_checknumber(L, 1);
  ReadResult rr;
  Error err;
  file__read_all(fd, &rr, &err);
  if (err != 0) {
    fprintf(stderr, "Failed to open file: error %d\n", (int)err);
    return -1;
  }
  lua_pushlstring(L, rr.data, rr.size);
  free(rr.data);
  return 1;
}

int lfile__shift(lua_State *L) {
  lua_settop(L, 2);
  int fd = luaL_checknumber(L, 1);
  int amt = luaL_checknumber(L, 2);
  Error err;
  file__shift(fd, amt, &err);
  if (err != 0) {
    fprintf(stderr, "Failed to open file: error %d\n", (int)err);
    return -1;
  }
  return 0;
}

int lfile__goto(lua_State *L) {
  lua_settop(L, 2);
  int fd = luaL_checknumber(L, 1);
  int pos = luaL_checknumber(L, 2);
  Error err;
  file__goto(fd, pos, &err);
  if (err != 0) {
    fprintf(stderr, "Failed to open file: error %d\n", (int)err);
    return -1;
  }
  return 0;
}

int lfile__remove(lua_State *L) {
  lua_settop(L, 1);
  const char *path = luaL_checkstring(L, 1);
  Error err;
  file__remove(path, &err);
  if (err != 0) {
    fprintf(stderr, "Failed to open file: error %d\n", (int)err);
    return -1;
  }
  return 0;
}

int lfile__move(lua_State *L) {
  lua_settop(L, 2);
  const char *old_path = luaL_checkstring(L, 1);
  const char *new_path = luaL_checkstring(L, 2);
  Error err;
  file__move(old_path, new_path, &err);
  if (err != 0) {
    fprintf(stderr, "Failed to open file: error %d\n", (int)err);
    return -1;
  }
  return 0;
}

int lfile__make_dir(lua_State *L) {
  lua_settop(L, 1);
  const char *path = luaL_checkstring(L, 1);
  Error err;
  file__make_dir(path, &err);
  if (err != 0) {
    fprintf(stderr, "Failed to open file: error %d\n", (int)err);
    return -1;
  }
  return 0;
}

int lfile__remove_dir(lua_State *L) {
  lua_settop(L, 1);
  const char *path = luaL_checkstring(L, 1);
  Error err;
  file__remove_dir(path, &err);
  if (err != 0) {
    fprintf(stderr, "Failed to open file: error %d\n", (int)err);
    return -1;
  }
  return 0;
}

int lfile__change_dir(lua_State *L) {
  lua_settop(L, 1);
  const char *path = luaL_checkstring(L, 1);
  Error err;
  file__change_dir(path, &err);
  if (err != 0) {
    fprintf(stderr, "Failed to open file: error %d\n", (int)err);
    return -1;
  }
  return 0;
}

int lfile__read_dir(lua_State *L) {
  lua_settop(L, 2);
  const char *path = luaL_checkstring(L, 1);

  Entry entry;
  Error err;
  lua_createtable(L, 0, 0);

  int idx = 0;
  while (idx++, file__read_dir(path, &entry, &err), entry.isEnd && err == 0) {
    lua_pushstring(L, entry.name);
    free(entry.name);
    entry.name = NULL;
    lua_insert(L, idx);
    lua_pop(L, 1);
  }

  if (err != 0) {
    fprintf(stderr, "Failed to open file: error %d\n", (int)err);
    return -1;
  }

  return 1;
}

void statr_as_l(lua_State *L, StatResult *sr) {
  lua_createtable(L, 0, 8);

  lua_pushnumber(L, sr->size);
  lua_setfield(L, -1, "size");
  lua_pop(L, 1);

  lua_pushnumber(L, sr->blocks);
  lua_setfield(L, -1, "blocks");
  lua_pop(L, 1);

  lua_pushnumber(L, sr->blocksize);
  lua_setfield(L, -1, "blocksize");
  lua_pop(L, 1);

  lua_pushnumber(L, sr->ino);
  lua_setfield(L, -1, "ino");
  lua_pop(L, 1);

  lua_pushnumber(L, sr->perm);
  lua_setfield(L, -1, "perm");
  lua_pop(L, 1);

  // Fill up those time fields
  static const char *time_fields[] = { "atime", "mtime", "ctime" };
  static const size_t time_offsets[] = { offsetof(StatResult, atime), offsetof(StatResult, mtime), offsetof(StatResult, ctime) };

  for (size_t i = 0; i < sizeof(time_fields) / sizeof(time_fields[0]); i++) {
    lua_createtable(L, 0, 2);
    char *srr = (char *)sr; // we view the stat result as bytes
    Time *time = (Time *)(srr + time_offsets[i]); // then just extract the field by byte offset

    lua_pushnumber(L, time->sec);
    lua_setfield(L, -1, "sec");
    lua_pop(L, 1);

    lua_pushnumber(L, time->nsec);
    lua_setfield(L, -1, "nsec");
    lua_pop(L, 1);

    lua_setfield(L, -1, time_fields[i]);
    lua_pop(L, 1);
  }

}

int lfile__stat(lua_State *L) {
  lua_settop(L, 1);
  const char *path = luaL_checkstring(L, 1);
  StatResult sr;
  Error err;
  file__stat(path, &sr, &err);
  if (err != 0) {
    fprintf(stderr, "Failed to open file: error %d\n", (int)err);
    return -1;
  }
  statr_as_l(L, &sr);
  return 1;
}

int lfile__fdstat(lua_State *L) {
  lua_settop(L, 1);
  int fd = luaL_checknumber(L, 1);
  StatResult sr;
  Error err;
  file__fdstat(fd, &sr, &err);
  if (err != 0) {
    fprintf(stderr, "Failed to open file: error %d\n", (int)err);
    return -1;
  }
  statr_as_l(L, &sr);
  return 1;
}

int lfile__permit(lua_State *L) {
  lua_settop(L, 2);

  const char *path = luaL_checkstring(L, 1);
  const char *flagss = luaL_checkstring(L, 2);

  bool read = can_read_s(flagss);
  bool write = can_write_s(flagss);
  bool exec = can_exec_s(flagss);

  int flags = 0;
  if (read) flags |= 0100;
  if (write) flags |= 0200;
  if (exec) flags |= 0300;

  Error err;
  file__permit(path, flags, &err);
  if (err != 0) {
    fprintf(stderr, "Failed to open file: error %d\n", (int)err);
    return -1;
  }

  return 0;
}
