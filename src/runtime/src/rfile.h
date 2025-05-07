#ifndef RFILE_H
#define RFILE_H

#include <lua.h>

int lfile__open(lua_State *L);
int lfile__close(lua_State *L);
int lfile__write(lua_State *L);
int lfile__read(lua_State *L);
int lfile__read_all(lua_State *L);
int lfile__shift(lua_State *L);
int lfile__goto(lua_State *L);
int lfile__remove(lua_State *L);
int lfile__move(lua_State *L);
int lfile__make_dir(lua_State *L);
int lfile__remove_dir(lua_State *L);
int lfile__change_dir(lua_State *L);
int lfile__read_dir(lua_State *L);
int lfile__stat(lua_State *L);
int lfile__fdstat(lua_State *L);
int lfile__permit(lua_State *L);
int lfile__truncate(lua_State *L);
int lfile__cwd(lua_State *L);

#endif
