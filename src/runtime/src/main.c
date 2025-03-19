#include <lauxlib.h>
#include <lua.h>
#include <lualib.h>
#include <stddef.h>
#include <stdio.h>

#include "../../filesystem/src/main.h"
#include "../../processes/c/processes.h"

#include "lib.h"

void export_stdlib(lua_State *L) {
  luaL_newlib(L, file_module);
  lua_setglobal(L, "file");
  luaL_newlib(L, errors_module);
  lua_setglobal(L, "errors");
}

int main(void) {
  lua_State *L = luaL_newstate();
  luaL_openlibs(L);

  Error err;

  int my_pid = proc__get_pid(&err);
  if (err < 0) {
    printf("ERROR: %d\n", err);
    return -1;
  }

  switch (my_pid) {
  case 1: {
    char buf[25] = "/persistent/sys/hello.lua";
    int len = 25;
    int out_pid = proc__create(buf, len, false, true, &err);
    if (err < 0) {
      printf("[1] ERROR: %d\n", err);
      return -1;
    }

    int in_pid = proc__create(buf, len, true, false, &err);
    if (err < 0) {
      printf("[1] ERROR: %d\n", err);
      return -1;
    }

    proc__pipe(out_pid, in_pid, &err);
    if (err < 0) {
      printf("[1] ERROR: %d\n", err);
    }

    proc__start(in_pid, &err);
    if (err < 0) {
      printf("[1] ERROR: %d\n", err);
    }

    sleep(1);

    proc__start(out_pid, &err);
    if (err < 0) {
      printf("[1] ERROR: %d\n", err);
      return -1;
    }

    break;
  }
  case 2: {
    char msg[5] = "test!";
    proc__output(msg, 5, &err);
    if (err < 0) {
      printf("[2] ERROR: %d\n", err);
      return -1;
    }

    proc__close_output(&err);
    if (err < 0) {
      printf("[2] ERROR: %d\n", err);
      return -1;
    }
    break;
  }
  case 3: {
    char buf[5];
    int bytesRead = proc__input_exact(buf, 5, &err);
    if (err < 0) {
      printf("[3] ERROR: %d\n", err);
      return -1;
    }

    printf("READ: \"%s\" [%d]\n", buf, bytesRead);
    break;
  }
  }

  printf("[%d] FINISHED\n", my_pid);

  return 0;

  char luaCodeBuffer[256];
  proc__get_lua_code(luaCodeBuffer, sizeof(luaCodeBuffer), &err);
  if (err < 0) {
    printf("Failed to load code from FS. Err: %d\n", err);
  }
  printf("Loaded code from FS: \n%s\n", luaCodeBuffer);

  char src[256];
  snprintf(src, sizeof(src),
           "local func, ok = load([[%s]])\nlocal success, err = "
           "pcall(func)\nif not success then\n  print(err)\nend",
           luaCodeBuffer);

  export_stdlib(L);

  if (luaL_loadstring(L, src) == LUA_OK) {
    if (lua_pcall(L, 0, 0, 0) == LUA_OK) {
      lua_pop(L, lua_gettop(L));
    } else {
      const char *err = lua_tostring(L, -1);
      printf("BOOTSTRAP PROCESS ERROR: %s\n", err);
    }
  } else {
    const char *err = lua_tostring(L, -1);
    printf("BOOTSTRAP PROCESS ERROR: %s\n", err);
  }

  fflush(stdout);

  lua_close(L);
  return 0;
}
