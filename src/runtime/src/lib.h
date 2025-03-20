#ifndef LIB_H
#define LIB_H

#include <lua.h>
#include "file.h"
#include "process.h"
#include "errors.h"
#include "lauxlib.h"

#define FILE_MODULE_NAME "file"
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

#define PROCESS_MODULE_NAME "process"
static const luaL_Reg process_module[] = {
  {"create", lprocess__create},
  {"start", lprocess__start},
  {"wait", lprocess__wait},
  {"output", lprocess__output},
  {"kill", lprocess__kill},
  {"get_pid", lprocess__get_pid},
  {"list", lprocess__list},
  {"pipe", lprocess__pipe},
  {"isatty", lprocess__isatty},
  {"exit", lprocess__exit},
  {"input", lprocess__input},
  {"input_all", lprocess__input_all},
  {"input_line", lprocess__input_line},
  {"close_input", lprocess__close_input},
  {NULL, NULL},
};

#define ERRORS_MODULE_NAME "errors"
static const luaL_Reg errors_module[] = {
  {"as_string", lerrors__as_string},
  {NULL, NULL},
};

typedef struct {
  const char *namespace;
  const char *function;
} Namespaced_Function;

// Put functions you want to alias to the global namespace in here
static const Namespaced_Function globals[] = {
  {PROCESS_MODULE_NAME, "output"},
  {PROCESS_MODULE_NAME, "input"},
  {PROCESS_MODULE_NAME, "input_all"},
  {PROCESS_MODULE_NAME, "input_line"},
  {NULL, NULL}
};

#endif
