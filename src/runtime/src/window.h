#ifndef WINDOW_H
#define WINDOW_H

#include <lua.h>

#ifdef __EMSCRIPTEN__
int lwindow__area(lua_State *L);
int lwindow__list(lua_State *L);
int lwindow__open(lua_State *L);
int lwindow__hide(lua_State *L);
int lwindow__show(lua_State *L);
int lwindow__close(lua_State *L);
#endif

#endif
