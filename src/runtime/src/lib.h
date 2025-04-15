#ifndef LIB_H
#define LIB_H

#include <lua.h>
#include "file.h"
#include "process.h"
#include "errors.h"
#include "terminal.h"
#include "lauxlib.h"
#ifdef __EMSCRIPTEN__
#include "window.h"
#endif

typedef struct {
  const char *name;
  const luaL_Reg *registry;
} Named_Module;

typedef struct {
  const char *namespace;
  const char *function;
} Namespaced_Function;

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
  {"truncate", lfile__truncate},
  {"cwd", lfile__cwd},
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
  {"close_output", lprocess__close_output},
  {NULL, NULL},
};

#define ERRORS_MODULE_NAME "errors"
static const luaL_Reg errors_module[] = {
  {"as_string", lerrors__as_string},
  {"ok", lerrors__ok},
  {NULL, NULL},
};

#define TERMINAL_MODULE_NAME "terminal"
static const luaL_Reg terminal_module[] = {
  {"clear", lterminal__clear},
#ifdef __EMSCRIPTEN__
  {"prompt", lterminal__prompt},
#endif
  {NULL, NULL},
};

#define WINDOW_MODULE_NAME "window"
static const luaL_Reg window_module[] = {
#ifdef __EMSCRIPTEN__
  {"area", lwindow__area},
  {"list", lwindow__list},
  {"open", lwindow__open},
  {"hide", lwindow__hide},
  {"show", lwindow__show},
  {"close", lwindow__close},
  {"focus", lwindow__focus},
  {"position", lwindow__position},
  {"move", lwindow__move},
  {"dimensions", lwindow__dimensions},
  {"resize", lwindow__resize},
#endif
  {NULL, NULL},
};

static const Named_Module custom_modules[] = {
  {FILE_MODULE_NAME, file_module},
  {PROCESS_MODULE_NAME, process_module},
  {ERRORS_MODULE_NAME, errors_module},
  {TERMINAL_MODULE_NAME, terminal_module},
  {WINDOW_MODULE_NAME, window_module},
  {NULL, NULL}
};

// Put functions you want to alias to the global namespace in here
static const Namespaced_Function globals[] = {
  {PROCESS_MODULE_NAME, "output"},
  {PROCESS_MODULE_NAME, "input"},
  {PROCESS_MODULE_NAME, "input_all"},
  {PROCESS_MODULE_NAME, "input_line"},
  {NULL, NULL}
};

#endif
