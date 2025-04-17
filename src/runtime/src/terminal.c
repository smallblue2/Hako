#include "terminal.h"
#include "lauxlib.h"
#ifdef __EMSCRIPTEN__
#include "../vendor/libedit/src/editline/readline.h"
#endif
#include "lua.h"
#include "../processes/c/processes.h"
#include <assert.h>
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#ifdef __EMSCRIPTEN__
#include <curses.h>
#endif

int get_terminal_width() {
#ifdef __EMSCRIPTEN__
  initscr();
  int rows, cols;
  getmaxyx(stdscr, rows, cols);
  (void)rows;
  endwin();
  return cols;
#endif
  return -1;
}

int get_terminal_height() {
#ifdef __EMSCRIPTEN__
  initscr();
  int cols, rows;
  getmaxyx(stdscr, rows, cols);
  (void)cols;
  endwin();
  return rows;
#endif
  return -1;
}

int lterminal__get_width(lua_State *L) {
  int width = get_terminal_width();

  lua_pushnumber(L, width);
  return 1;
}

int lterminal__get_height(lua_State *L) {
  int height = get_terminal_height();

  lua_pushnumber(L, height);
  return 1;
}

int lterminal__clear(__attribute__((unused)) lua_State *L) {
  printf("\033[2J\033[H");
  fflush(stdout);
  return 0;
}

#ifdef __EMSCRIPTEN__
int lterminal__prompt(lua_State *L) {
  const char *prompt = luaL_checkstring(L, 1);

  Error err = 0;
  if (proc__is_stdin_pipe(&err) || proc__is_stdout_pipe(&err)) {
    lua_pushnil(L);
    lua_pushnumber(L, ENOTTY);
    return 2;
  }

  char *line = readline(prompt);

  if (*line) {
    char *expanded;
    int r = history_expand(line, &expanded);
    if (!(r < 0 || r == 2)) {
      add_history(expanded);
    }
    free(expanded);
  }

  lua_pushstring(L, line);
  lua_pushnil(L);
  free(line);
  return 2;
}
#endif
