#ifndef SHARED_H
#define SHARED_H

#include <lua.h>
#include <stdbool.h>
#include <unistd.h>

#define FALSE_ROOT "/persistent"
#define FALSE_ROOT_SIZE sizeof(FALSE_ROOT) - 1

bool checkboolean(lua_State *L, int narg);
const char *absolute(const char *path);

#endif
