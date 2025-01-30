#include <lua.h>
#include <lualib.h>
#include <lauxlib.h>
#include <string.h>
#include <unistd.h>
#include <stdlib.h>

#define CHUNK_SIZE 8

char *get_stdin(void) {
  size_t size = CHUNK_SIZE;
  char *buf = calloc(size + 1, sizeof(char));
  char *ptr = buf;
  if (buf == NULL) {
    perror("Allocation failed");
    return NULL;
  }
  int bytes_read = 0;

  while ((bytes_read = read(STDIN_FILENO, ptr, CHUNK_SIZE)) > 0) {
    size_t off = ptr - buf;
    void *new_data = realloc(buf, size + CHUNK_SIZE);
    if (new_data == NULL) {
      perror("Allocation failed");
      return NULL;
    }
    size += CHUNK_SIZE;

    buf = new_data;
    ptr = buf + off + bytes_read;
  }

  printf("last: %d\n", bytes_read);

  return buf;
}


int main(void) {
  lua_State *L = luaL_newstate();
  luaL_openlibs(L);

  printf("Reading lua code from stdin ...\n");
  // char *src = get_stdin();

  // int len = strlen(src);
  // for (int i = 0; i < len; i++) {
  //   printf("%d ", src[i]);
  // }
  // printf("\n");
  char *src =
    "local func, ok = load(io.read('*a'))\n"
    "pcall(func)";

  if (luaL_loadstring(L, src) == LUA_OK) {
    if (lua_pcall(L, 0, 0, 0) == LUA_OK) {
      lua_pop(L, lua_gettop(L));
    } else {
      const char *err = lua_tostring(L, -1);
      printf("Running: %s\n", err);
    }
  } else {
    const char *err = lua_tostring(L, -1);
    printf("Loading: %s\n", err);
  }

  fflush(stdout);
  // free(src);

  lua_close(L);
  return 0;
}
