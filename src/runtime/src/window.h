#ifndef WINDOW_H
#define WINDOW_H

#include <lua.h>

#ifdef __EMSCRIPTEN__
int lwindow__area(lua_State *L);
int lwindow__list(lua_State *L);
int lwindow__open(lua_State *L);
int lwindow__hide(lua_State *L);
int lwindow__show(lua_State *L);
int lwindow__focus(lua_State *L);
int lwindow__position(lua_State *L);
int lwindow__move(lua_State *L);
int lwindow__dimensions(lua_State *L);
int lwindow__resize(lua_State *L);
int lwindow__close(lua_State *L);
#endif

#endif
