#ifndef ERRORS_H
#define ERRORS_H

#include <lua.h>

int lerrors__as_string(lua_State *L);
int lerrors__ok(lua_State *L);

#endif
