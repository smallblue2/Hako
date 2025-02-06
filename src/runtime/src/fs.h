#ifndef FS_H
#define FS_H

#include <lua.h>

int lfile__open(lua_State *L);
int lfile__close(lua_State *L);
int lfile__write(lua_State *L);
int lfile__read(lua_State *L);
int lfile__read_all(lua_State *L);
int lfile__shift(lua_State *L);
int lfile__goto(lua_State *L);
int lfile__remove(lua_State *L);
int lfile__move(lua_State *L);
int lfile__make_dir(lua_State *L);
int lfile__remove_dir(lua_State *L);
int lfile__change_dir(lua_State *L);
int lfile__read_dir(lua_State *L);
int lfile__stat(lua_State *L);
int lfile__fdstat(lua_State *L);
int lfile__permit(lua_State *L);

typedef struct {
  const char *name;
  lua_CFunction func;
} ModuleEntry;

static const ModuleEntry file_module[] = {
  {"open", lfile__open},
  {"close", lfile__close},
  {"write", lfile__write},
  {"read", lfile__read},
  {"read_all", lfile__read_all},
  {"shift", lfile__shift},
  {"goto", lfile__goto},
  {"remove", lfile__remove},
  {"move", lfile__move},
  {"make_dir", lfile__make_dir},
  {"remove_dir", lfile__remove_dir},
  {"change_dir", lfile__change_dir},
  {"read_dir", lfile__read_dir},
  {"stat", lfile__stat},
  {"fdstat", lfile__fdstat},
  {"permit", lfile__permit},
};

static const size_t file_module_len = sizeof(file_module) / sizeof(file_module[0]);

static const ModuleEntry *stdlib[] = { file_module };
static const size_t stdlib_len[] = { file_module_len };
static const char *stdlib_ns[] = { "file" };
static const size_t nmodules = sizeof(stdlib) / sizeof(stdlib[0]);

#endif
