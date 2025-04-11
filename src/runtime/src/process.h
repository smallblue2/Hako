#ifndef PROCESS_H
#define PROCESS_H

#include <lua.h>

int lprocess__input(lua_State *L);
int lprocess__input_all(lua_State *L);
int lprocess__input_line(lua_State *L);
int lprocess__close_input(lua_State *L);
int lprocess__close_output(lua_State *L);
int lprocess__output(lua_State *L);

int lprocess__wait(lua_State *L);
int lprocess__create(lua_State *L);
int lprocess__kill(lua_State *L);
int lprocess__list(lua_State *L);
int lprocess__get_pid(lua_State *L);
int lprocess__pipe(lua_State *L);
int lprocess__isatty(lua_State *L);
int lprocess__start(lua_State *L);
int lprocess__exit(lua_State *L);

#endif
