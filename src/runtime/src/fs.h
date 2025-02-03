#ifndef FS_H
#define FS_H

#include <lua.h>

int lfile__open(lua_State *L);

typedef struct {
  const char *name;
  lua_CFunction func;
} ModuleFunc;

static const ModuleFunc file_module_funcs[] = {
  {"open", lfile__open},
};

#endif
