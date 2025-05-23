#include "rfile.h"
#include "../../filesystem/src/file.h"
#include "shared.h"
#include <errno.h>
#include <fcntl.h>
#include <lauxlib.h>
#include <lua.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>
#include <assert.h>

bool can_read_s(const char *flags) { return strchr(flags, 'r') != NULL; }

bool can_write_s(const char *flags) { return strchr(flags, 'w') != NULL; }

bool can_exec_s(const char *flags) { return strchr(flags, 'x') != NULL; }

bool can_create_s(const char *flags) { return strchr(flags, 'c') != NULL; }

/**
 * @@ file.open(path: string, flags: string) -> (fd: int | nil, err: number |
 * nil)
 */
int lfile__open(lua_State *L) {
  lua_settop(L, 2);

  const char *path = luaL_checkstring(L, 1);
  const char *flagss = luaL_checkstring(L, 2);

  char *fpath = fake_path(path);
  if (fpath == NULL) {
    lua_pushnil(L);
    lua_pushnumber(L, E_DOESNTEXIST);
    goto cleanup;
  }

  bool read = can_read_s(flagss);
  bool write = can_write_s(flagss);
  bool create = can_create_s(flagss);

  int flags = 0;

  if (read && write)
    flags |= O_RDWR;
  else if (read)
    flags |= O_RDONLY;
  else if (write)
    flags |= O_WRONLY;

  if (create)
    flags |= O_CREAT;

  Error err = 0;
  int fd = file__open(fpath, flags, &err);
  if (fd < 0) {
    lua_pushnil(L);
    lua_pushnumber(L, err);
    goto cleanup;
  }

  lua_pushnumber(L, fd);
  lua_pushnil(L);
cleanup:
  free(fpath);
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
    lua_pushnumber(L, err);
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
    lua_pushnumber(L, err);
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
    lua_pushnumber(L, err);
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
    lua_pushnumber(L, err);
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
    lua_pushnumber(L, err);
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
    lua_pushnumber(L, err);
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

  char *fpath = fake_path(path);
  if (fpath == NULL) {
    lua_pushnumber(L, E_DOESNTEXIST);
    return 1;
  }

  Error err;
  file__remove(fpath, &err);
  if (err != 0) {
    lua_pushnumber(L, err);
    goto cleanup;
  }
  lua_pushnil(L);
cleanup:
  free(fpath);
  return 1;
}

/**
 * @@ file.move(old_path: string, new_path: string) -> (err: number | nil)
 */
int lfile__move(lua_State *L) {
  lua_settop(L, 2);
  const char *old_path = luaL_checkstring(L, 1);
  const char *new_path = luaL_checkstring(L, 2);

  char *old_fpath = fake_path(old_path);
  if (old_fpath == NULL) {
    lua_pushnumber(L, E_DOESNTEXIST);
    return 1;
  }

  char *new_fpath = fake_path(new_path);
  if (new_fpath == NULL) {
    lua_pushnumber(L, E_DOESNTEXIST);
    free(old_fpath);
    return 1;
  }

  Error err;
  file__move(old_fpath, new_fpath, &err);
  if (err != 0) {
    lua_pushnumber(L, err);
    goto cleanup;
  }
  lua_pushnil(L);

cleanup:
  free(new_fpath);
  free(old_fpath);
  return 1;
}

/**
 * @@ file.make_dir(dir_path: string) -> (err: number | nil)
 */
int lfile__make_dir(lua_State *L) {
  lua_settop(L, 1);
  const char *path = luaL_checkstring(L, 1);

  char *fpath = fake_path(path);
  if (fpath == NULL) {
    lua_pushnumber(L, E_DOESNTEXIST);
    goto cleanup;
  }

  Error err;
  file__make_dir(fpath, &err);

  if (err != 0) {
    lua_pushnumber(L, err);
    goto cleanup;
  }
  lua_pushnil(L);
cleanup:
  free(fpath);
  return 1;
}

/**
 * @@ file.remove_dir(dir_path: string) -> (err: number | nil)
 */
int lfile__remove_dir(lua_State *L) {
  lua_settop(L, 1);
  const char *path = luaL_checkstring(L, 1);

  char *fpath = fake_path(path);
  if (fpath == NULL) {
    lua_pushnumber(L, E_DOESNTEXIST);
    goto cleanup;
  }

  Error err;
  file__remove_dir(fpath, &err);
  if (err != 0) {
    lua_pushnumber(L, err);
    goto cleanup;
  }
  lua_pushnil(L);
cleanup:
  free(fpath);
  return 1;
}

/**
 * @@ file.change_dir(dir_path: string) -> (err: number | nil)
 */
int lfile__change_dir(lua_State *L) {
  lua_settop(L, 1);
  const char *path = luaL_checkstring(L, 1);

  char *fpath = fake_path(path);
  if (fpath == NULL) {
    lua_pushnumber(L, E_DOESNTEXIST);
    goto cleanup;
  }

  Error err;
  file__change_dir(fpath, &err);
  if (err != 0) {
    lua_pushnumber(L, err);
    goto cleanup;
  }
  lua_pushnil(L);
cleanup:
  free(fpath);
  return 1;
}

/**
 * @@ file.read_dir(dir_path: string) -> (entries: string[], err: number | nil)
 */
int lfile__read_dir(lua_State *L) {
  char **entries = NULL;
  char *fpath = NULL;

  lua_settop(L, 2);
  const char *path = luaL_checkstring(L, 1);

  fpath = fake_path(path);
  if (fpath == NULL) {
    lua_pushnil(L);
    lua_pushnumber(L, E_DOESNTEXIST);
    goto cleanup;
  }

  Error err = 0;
  lua_newtable(L);

  entries = file__read_dir(fpath, &err);
  if (err != 0) {
    lua_pushnil(L);
    lua_pushnumber(L, err);
    goto cleanup;
  }

  int idx = 0;
  while (*(entries + idx) != NULL) {
    char *entry = *(entries + idx);
    lua_pushstring(L, entry);
    free(entry);
    lua_pushnumber(L, idx + 1);
    lua_insert(L, -2);
    lua_settable(L, -3);
    idx++;
  }

  lua_pushnil(L);
cleanup:
  free(entries);
  free(fpath);
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

  lua_pushnumber(L, sr->type);
  lua_setfield(L, -2, "type");

  int usr = (sr->perm & 0700) >> 6;
  bool read = (usr & 4) != 0;
  bool write = (usr & 2) != 0;
  bool exec = (usr & 1) != 0;

  char perm[4] = {0};
  int i = 0;
  if (read)
    perm[i++] = 'r';
  if (write)
    perm[i++] = 'w';
  if (exec)
    perm[i] = 'x';

  lua_pushstring(L, perm);
  lua_setfield(L, -2, "perm");

  // Fill up those time fields
  static const char *time_fields[] = {"atime", "mtime", "ctime"};
  static const size_t time_offsets[] = {offsetof(StatResult, atime),
                                        offsetof(StatResult, mtime),
                                        offsetof(StatResult, ctime)};

  for (size_t i = 0; i < sizeof(time_fields) / sizeof(time_fields[0]); i++) {
    lua_createtable(L, 0, 2);
    char *srr = (char *)sr; // we view the stat result as bytes
    Time *time =
        (Time *)(srr +
                 time_offsets[i]); // then just extract the field by byte offset

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
 *   perm: number, -- permissions (Only user: 01 Read, 001 Write, 0001 Execute)
 * 20
 *
 *   type: number, -- compare to FILE and DIRECTORY constants
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

  char *fpath = fake_path(path);
  if (fpath == NULL) {
    lua_pushnil(L);
    lua_pushnumber(L, E_DOESNTEXIST);
    return 2;
  }

  StatResult sr;
  Error err;
  file__stat(fpath, &sr, &err);
  if (err != 0) {
    lua_pushnil(L);
    lua_pushnumber(L, err);
    goto cleanup;
  }
  statr_as_l(L, &sr);
  lua_pushnil(L);
cleanup:
  free(fpath);
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
 *   perm: number, -- permissions (Only user: 01 Read, 001 Write, 0001 Execute)
 * 20
 *
 *   type: number, -- compare to FILE and DIRECTORY constants
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
    lua_pushnumber(L, err);
    return 2;
  }
  statr_as_l(L, &sr);
  lua_pushnil(L);
  return 2;
}

/**
 * @@ file.permit(path: string, flags: string) -> (err: number | nil)
 */
int lfile__permit(lua_State *L) {
  lua_settop(L, 2);

  const char *path = luaL_checkstring(L, 1);
  const char *flagss = luaL_checkstring(L, 2);

  char *fpath = fake_path(path);
  if (fpath == NULL) {
    lua_pushnumber(L, E_DOESNTEXIST);
    return 1;
  }

  bool read = can_read_s(flagss);
  bool write = can_write_s(flagss);
  bool exec = can_exec_s(flagss);

  int flags = 0;
  if (read)
    flags |= 0400;
  if (write)
    flags |= 0200;
  if (exec)
    flags |= 0100;

  Error err;
  file__permit(fpath, flags, &err);
  if (err != 0) {
    lua_pushnumber(L, err);
    goto cleanup;
  }

  lua_pushnil(L);
cleanup:
  free(fpath);
  return 1;
}

int lfile__truncate(lua_State *L) {
  int fd = luaL_checknumber(L, 1);
  int length = luaL_checknumber(L, 2);
  luaL_argcheck(L, length >= 0, 2, "length must be 0 or more");

  Error err = 0;
  file__truncate(fd, length, &err);
  if (err != 0) {
    lua_pushnumber(L, err);
    return 1;
  }

  lua_pushnil(L);
  return 1;
}

int lfile__cwd(lua_State *L) {
  Error err = 0;
  char *cwd = file__cwd(&err);
  if (err != 0) {
    lua_pushnil(L);
    lua_pushnumber(L, err);
    return 2;
  }

  int shift = sizeof("persistent");
  const char *no_prefix = cwd + shift;
  memmove(cwd, no_prefix, strlen(no_prefix) + 1);
  if (cwd[0] == '\0') {
    strcpy(cwd, "/");
  }

  lua_pushstring(L, cwd);
  lua_pushnil(L);
  return 2;
}
