#include "shared.h"
#include "lauxlib.h"
#include <string.h>
#include <stdlib.h>

// Not in mainline lua, but adapted from: https://github.com/luau-lang/luau/pull/221
bool checkboolean(lua_State *L, int narg) {
  if (!lua_isboolean(L, narg)) {
    luaL_typeerror(L, narg, lua_typename(L, LUA_TBOOLEAN));
    return false;
  }
  return lua_toboolean(L, narg);
}

const char *absolute(const char *path) {
#ifdef __EMSCRIPTEN__
  static char resolved_with_prefix[PATH_MAX] = FALSE_ROOT;
  static char *resolved_without_prefix = resolved_with_prefix + FALSE_ROOT_SIZE;
  bool is_absolute = path[0] == '/';
  if (is_absolute) {
    // Make sure to add the root prefix, blindly
    // as any absolute path should implicitly be based from that prefix
    memcpy(resolved_without_prefix, path, strlen(path) + 1);
    return resolved_with_prefix;
  }
  static char resolved[PATH_MAX] = {0};
  if (realpath(path, resolved) == NULL) {
    return NULL;
  }
  // Must have root prefix
  if (strncmp(resolved, FALSE_ROOT, FALSE_ROOT_SIZE) != 0) {
    return NULL;
  }
  return resolved;
#else
  return path;
#endif
}

char *absolute_alloc(const char *path) {
  return strdup(absolute(path));
}

