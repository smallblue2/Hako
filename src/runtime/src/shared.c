#include "shared.h"
#include "lauxlib.h"

// Not in mainline lua, but adapted from: https://github.com/luau-lang/luau/pull/221
bool checkboolean(lua_State *L, int narg) {
  if (!lua_isboolean(L, narg)) {
    luaL_typeerror(L, narg, lua_typename(L, LUA_TBOOLEAN));
    return false;
  }
  return lua_toboolean(L, narg);
}
