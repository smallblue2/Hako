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
    lua_pushnumber(L, window.show);
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

int lwindow__close(lua_State *L) {
  int id = luaL_checknumber(L, 1);
  window__close(id);
  return 0;
}
