#ifndef LIB_H
#define LIB_H

#include <lua.h>
#include "file.h"
#include "errors.h"
#include "lauxlib.h"

static const luaL_Reg file_module[] = {
  {"open", lfile__open},
  {"close", lfile__close},
  {"write", lfile__write},
  {"read", lfile__read},
  {"read_all", lfile__read_all},
  {"shift", lfile__shift},
  {"jump", lfile__goto},
  {"remove", lfile__remove},
  {"move", lfile__move},
  {"make_dir", lfile__make_dir},
  {"remove_dir", lfile__remove_dir},
  {"change_dir", lfile__change_dir},
  {"read_dir", lfile__read_dir},
  {"stat", lfile__stat},
  {"fdstat", lfile__fdstat},
  {"permit", lfile__permit},
  {NULL, NULL},
};

static const luaL_Reg errors_module[] = {
  {"as_string", lerrors__as_string},
  {NULL, NULL},
};

#endif
