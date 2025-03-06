#include <lua.h>
#include <lualib.h>
#include <lauxlib.h>
#include <stddef.h>

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

  int current_pid = proc__getPid(&err);
  if (err != 0) {
    printf("Failed to get pid\n");
  } else {
    printf("Current proc pid: %d\n", current_pid);
  }
  
  if (current_pid == 1) {
    char sourceCode[256];
    Process *proc_list = proc__list(&err);
    if (err == 0) {
      printf("========= LISTING ONE PROCESS =========\n");
      printf("pid[0] -> %d\n", proc_list->pid);
      printf("created_low[0] -> %d\n", proc_list->created_low);
      printf("created_high[0] -> %d\n", proc_list->created_high);
      uint64_t created = proc_list->created_low | ((uint64_t)proc_list->created_high << 32);
      printf("created -> %lld\n", created);
      printf("alive[0] -> %d\n", proc_list->alive);
      printf("state[0] -> %d\n", proc_list->state);
      printf("========= END =========\n");
      free(proc_list);
    }

    char buff[256];
    int new_pid = proc__create(buff, 0, false, false, &err);
    if (err == 0) {
      printf("Created new process (new PID: %d)\n", new_pid);
      printf("I am waiting on my buddy proc %d\n", new_pid);
      proc__wait(new_pid, &err);
    }

    printf("I am proc %d and I think this is very sad :(\n", current_pid);


  } else {
    printf("HELLO I AM PROCESS %d I AM KILLING MYSELF AHHHHHHHHHHH\n", current_pid);
    proc__kill(current_pid, &err);
    if (err != 0) {
      printf("I couldn't bring myself to do it... (err: %d)\n", err);
    }
  }



  char *src =
    "local func, ok = load(io.read('*a'))\n"
    "local success, err = pcall(func)\n"
    "if not success then\n"
    "  print(err)\n"
    "end";

  file__initialiseFS();

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
