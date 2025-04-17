#ifndef TERMINAL_H
#define TERMINAL_H

#include <lua.h>

int lterminal__clear(lua_State *L);
#ifdef __EMSCRIPTEN__
int lterminal__prompt(lua_State *L);
#endif
int lterminal__get_width(lua_State *L);
int lterminal__get_height(lua_State *L);

#endif
