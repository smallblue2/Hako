#include <lua.h>
#include <lualib.h>
#include <lauxlib.h>
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

  int current_pid = proc__get_pid(&err);
  if (err != 0) {
    printf("Failed to get pid\n");
  } else {
    printf("[%d] Current proc pid: %d\n", current_pid, current_pid);
  }

  switch (current_pid) {
    case 1: {
      char buff[256];
      int len = snprintf(buff, sizeof(buff), "/persistent/hello.lua");
      int new_pid = proc__create(buff, len, false, false, &err);
      if (err < 0) {
        printf("[1] Couldn't create process (err %d)\n", err);
        return -1;
      }
      printf("[1] Created new process (new PID: %d)\n", new_pid);

      proc__start(new_pid, &err);
      if (err < 0) {
        printf("[1] Couldn't start out_pid (err: %d)\n!", err);
      }

      printf("[1] Waiting on pid: %d\n", new_pid);
      int exit_code = proc__wait(new_pid, &err);
      if (err < 0) {
        printf("[1] Waiting on pid: %d failed!\n", new_pid);
        return -1;
      }
      printf("[1] Finished waiting on pid: %d (Exit code: %d)!\n", new_pid);
      printf("[1] Process returned exit code: %d!\n", exit_code);
      break;
    }
    case 2: {
      printf("[2] I AM ALIVE!\n");
      printf("[2] But only for a short while :(");
      printf("[2] Exiting...");
      Error err;
      proc__exit(0, &err);
      if (err < 0) {
        printf("[2] Failed to exit");
        return -1;
      }

      break;
    }
  }

  char luaCodeBuffer[256];
  proc__get_lua_code(luaCodeBuffer, sizeof(luaCodeBuffer), &err);
  printf("Loaded code from FS: \n%s\n", luaCodeBuffer);

  char src[256];
  snprintf(src, sizeof(src), "local func, ok = load('%s')\nlocal success, err = pcall(func)\nif not success then\n  print(err)\nend", luaCodeBuffer);

  // char *src =
  //   "local func, ok = load(io.read('*a'))\n"
  //   "local success, err = pcall(func)\n"
  //   "if not success then\n"
  //   "  print(err)\n"
  //   "end";

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
