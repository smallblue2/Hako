#ifndef PROCESS_H
#define PROCESS_H

#include <lua.h>
#include "../../processes/c/processes.h"

int lprocess__input_pipe(lua_State *L);
int lprocess__input_all_pipe(lua_State *L);
int lprocess__input_line_pipe(lua_State *L);
int lprocess__output_pipe(lua_State *L);
int lprocess__error_pipe(lua_State *L);
int lprocess__wait(lua_State *L);
int lprocess__create(lua_State *L);
int lprocess__kill(lua_State *L);
int lprocess__list(lua_State *L);
int lprocess__get_pid(lua_State *L);
int lprocess__pipe(lua_State *L);
int lprocess__isatty(lua_State *L);
int lprocess__input(lua_State *L);
int lprocess__input_all(lua_State *L);
int lprocess__input_line(lua_State *L);
int lprocess__output(lua_State *L);
int lprocess__start(lua_State *L);

#endif
