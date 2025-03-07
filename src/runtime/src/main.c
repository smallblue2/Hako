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
      int out_pid = proc__create(buff, 0, false, true, &err);
      if (err < 0) {
        printf("[1] Couldn't create process to pipe stdout (err %d)\n", err);
        return -1;
      }
      printf("[1] Created new process to pipe stdout (new PID: %d)\n", out_pid);

      int in_pid = proc__create(buff, 0, true, false, &err);
      if (err < 0) {
        printf("[1] Couldn't create process to pipe stdin (err %d)\n", err);
        return -1;
      }
      printf("[1] Created new process to pipe stdin (new PID: %d)\n", in_pid);

      proc__start(out_pid, &err);
      if (err < 0) {
        printf("[1] Couldn't start out_pid (err: %d)\n!", err);
      }

      proc__pipe(out_pid, in_pid, &err);
      if (err < 0) {
        printf("[1] Failed to pipe processes (err: %d)\n", err);
        return -1;
      }

      proc__start(in_pid, &err);
      if (err < 0) {
        printf("[1] Couldn't start in_pid (err: %d)\n!", err);
      }

      break;
    }
    case 2: {
      Error err;
      char buf[256];
      int len = snprintf(buf, sizeof(buf), "[2] Proc %d here!\n", current_pid);
      proc__output(buf, len, &err);
      if (err < 0) {
        printf("[2] Couldn't output");
      }

      len = snprintf(buf, sizeof(buf), "[2] Proc %d here! Piping into proc 3! (hopefully)\n", current_pid);
      proc__output(buf, len, &err);
      if (err < 0) {
        printf("[2] Couldn't output");
      }

      break;
    }
    case 3: {
      Error err;
      char buf[256];
      int len = snprintf(buf, sizeof(buf), "[3] Proc %d here!\n", current_pid);
      proc__output(buf, len, &err);
      if (err < 0) {
        printf("[3] Couldn't output");
      }

      len = snprintf(buf, sizeof(buf), "[3] Proc %d reading from stdin...\n", current_pid);
      proc__output(buf, len, &err);
      if (err < 0) {
        printf("[3] Couldn't output");
      }

      len = proc__input_all(buf, sizeof(buf), &err);
      if (err < 0) {
        printf("[3] Couldn't read input");
      }

      char bufout[256];
      len = snprintf(bufout, sizeof(buf), "[3] Read: %s\n", buf);
      proc__output(bufout, len, &err);
      if (err < 0) {
        printf("[3] Couldn't output");
      }

      len = snprintf(buf, sizeof(buf), "[3] Proc %d read from stdin!\n", current_pid);
      proc__output(buf, len, &err);
      if (err < 0) {
        printf("[3] Couldn't output");
      }

      break;
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
