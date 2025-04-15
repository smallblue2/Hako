#include "window.h"
#include "../deapi/src/deapi.h"
#include "lauxlib.h"
#include "lua.h"
#include <stdlib.h>

int lwindow__area(lua_State *L) {
  const Rect rect = window__area();
  lua_createtable(L, 0, 2);
  lua_pushnumber(L, rect.width);
  lua_setfield(L, -2, "width");
  lua_pushnumber(L, rect.height);
  lua_setfield(L, -2, "height");
  return 1;
}

int lwindow__list(lua_State *L) {
  const WindowList r = window__list();
  lua_createtable(L, r.length, 0);
  for (int i = 0; i < r.length; i++) {
    OpenWindow window = r.list[i];
    lua_createtable(L, 0, 3);
    lua_pushnumber(L, window.id);
    lua_setfield(L, -2, "id");
    lua_pushnumber(L, window.type);
    lua_setfield(L, -2, "type");
    lua_pushboolean(L, window.show);
    lua_setfield(L, -2, "show");
    lua_seti(L, -2, i + 1);
  }
  free(r.list);
  return 1;
}

int lwindow__open(lua_State *L) {
  WindowType type = luaL_checknumber(L, 1);
  lua_pushnumber(L, window__open(type));
  return 1;
}

int lwindow__hide(lua_State *L) {
  int id = luaL_checknumber(L, 1);
  window__hide(id);
  return 0;
}

int lwindow__show(lua_State *L) {
  int id = luaL_checknumber(L, 1);
  window__show(id);
  return 0;
}

int lwindow__focus(lua_State *L) {
  int id = luaL_checknumber(L, 1);
  window__focus(id);
  return 0;
}

int lwindow__position(lua_State *L) {
  int id = luaL_checknumber(L, 1);
  int x = window__get_x(id);
  int y = window__get_y(id);
  lua_createtable(L, 0, 2);
  lua_pushnumber(L, x);
  lua_setfield(L, -2, "x");
  lua_pushnumber(L, y);
  lua_setfield(L, -2, "y");
  return 1;
}

int lwindow__move(lua_State *L) {
  int id = luaL_checknumber(L, 1);
  int x = luaL_checknumber(L, 2);
  int y = luaL_checknumber(L, 3);
  window__move(id, x, y);
  return 0;
}

int lwindow__dimensions(lua_State *L) {
  int id = luaL_checknumber(L, 1);
  int width = window__get_width(id);
  int height = window__get_height(id);
  lua_createtable(L, 0, 2);
  lua_pushnumber(L, width);
  lua_setfield(L, -2, "width");
  lua_pushnumber(L, height);
  lua_setfield(L, -2, "height");
  return 1;
}

int lwindow__resize(lua_State *L) {
  int id = luaL_checknumber(L, 1);
  int width = luaL_checknumber(L, 2);
  int height = luaL_checknumber(L, 3);
  window__resize(id, width, height);
  return 0;
}

int lwindow__close(lua_State *L) {
  int id = luaL_checknumber(L, 1);
  window__close(id);
  return 0;
}
