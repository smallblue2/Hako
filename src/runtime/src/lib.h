#ifndef LIB_H
#define LIB_H

#include <lua.h>
#include "file.h"
#include "errors.h"

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

static const ModuleEntry errors_module[] = {
  {"as_string", lerrors__as_string},
};
static const size_t errors_module_len = sizeof(errors_module) / sizeof(errors_module[0]);

static const ModuleEntry *stdlib[] = { file_module, errors_module };
static const size_t stdlib_len[] = { file_module_len, errors_module_len };
static const char *stdlib_ns[] = { "file", "errors" };
static const size_t nmodules = sizeof(stdlib) / sizeof(stdlib[0]);

#endif
