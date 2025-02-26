#include <fcntl.h>
#include <time.h>
#include <lauxlib.h>
#include <lua.h>
#include <lualib.h>
#include <lauxlib.h>
#include <stddef.h>

#include <stdlib.h>
#include <unity.h>
#include <stdio.h>
#include <sys/stat.h>

#include "../src/lib.h"

lua_State *L = NULL;
int unique_test_id = 0;

#define STATIC_FMT_SIZE 4096
static char static_fmt_buf[STATIC_FMT_SIZE] = {0};

void setUp(void) {
  srand(time(NULL));
  unique_test_id = rand();
  L = luaL_newstate();
  luaL_openlibs(L);
  luaL_newlib(L, file_module);
  lua_setglobal(L, "file");
}

void tearDown(void) {
  fflush(stdout);
  fflush(stderr);
  lua_close(L);
}

// int lfile__open(lua_State *L);
// int lfile__close(lua_State *L);
// int lfile__write(lua_State *L);
// int lfile__read(lua_State *L);
// int lfile__read_all(lua_State *L);
// int lfile__shift(lua_State *L);
// int lfile__goto(lua_State *L);
// int lfile__remove(lua_State *L);
// int lfile__move(lua_State *L);
// int lfile__make_dir(lua_State *L);
// int lfile__remove_dir(lua_State *L);
// int lfile__change_dir(lua_State *L);
// int lfile__read_dir(lua_State *L);
// int lfile__stat(lua_State *L);
// int lfile__fdstat(lua_State *L);
// int lfile__permit(lua_State *L);

void test_file_open(void) {
  TEST_ASSERT_MESSAGE(L != NULL, "Lua is not initialized properly");
  int top = lua_gettop(L);

  snprintf(static_fmt_buf, STATIC_FMT_SIZE,
      "local fd, err = file.open('/tmp/%d-file-open', 'c')\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "return 0", unique_test_id);
  if (LUA_OK != luaL_dostring(L, static_fmt_buf)) {
    const char *err = lua_tostring(L, -1);
    fprintf(stderr, "lua code failed to run: %s\n", err);
    TEST_FAIL();
  }
  TEST_ASSERT_EQUAL_INT_MESSAGE(LUA_TNUMBER, lua_type(L, -1), "expected to get integer result");
  TEST_ASSERT_EQUAL_INT_MESSAGE(0, lua_tonumber(L, -1), "file.open returned an error code");

  lua_settop(L, top);
}

void test_file_close(void) {
  TEST_ASSERT_MESSAGE(L != NULL, "Lua is not initialized properly");
  int top = lua_gettop(L);

  snprintf(static_fmt_buf, STATIC_FMT_SIZE,
      "local fd, err = file.open('/tmp/%d-file-close', 'c')\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "local err = file.close(fd)\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "return 0", unique_test_id);
  if (LUA_OK != luaL_dostring(L, static_fmt_buf)) {
    const char *err = lua_tostring(L, -1);
    fprintf(stderr, "lua code failed to run: %s\n", err);
    TEST_FAIL();
  }
  TEST_ASSERT_EQUAL_INT_MESSAGE(LUA_TNUMBER, lua_type(L, -1), "expected to get integer result");
  TEST_ASSERT_EQUAL_INT_MESSAGE(0, lua_tonumber(L, -1), "file.open or file.close returned an error code");

  lua_settop(L, top);
}

void test_file_write(void) {
  TEST_ASSERT_MESSAGE(L != NULL, "Lua is not initialized properly");
  int top = lua_gettop(L);

  snprintf(static_fmt_buf, STATIC_FMT_SIZE,
      "local fd, err = file.open('/tmp/%d-file-write', 'rwc')\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "local err = file.write(fd, 'Hello, world')\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "file.close(fd)\n"
      "fd = file.open('/tmp/%d-file-write', 'r')\n"
      "local res, err = file.read(fd, 12)\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "return res", unique_test_id, unique_test_id);
  if (LUA_OK != luaL_dostring(L, static_fmt_buf)) {
    const char *err = lua_tostring(L, -1);
    fprintf(stderr, "lua code failed to run: %s\n", err);
    TEST_FAIL();
  }
  TEST_ASSERT_EQUAL_INT_MESSAGE(LUA_TSTRING, lua_type(L, -1), "expected to get string result");
  TEST_ASSERT_EQUAL_STRING_MESSAGE("Hello, world", lua_tostring(L, -1), "Written contents are different from what is expected");

  lua_settop(L, top);
}

int main(void) {
  UNITY_BEGIN();
  RUN_TEST(test_file_open);
  RUN_TEST(test_file_close);
  RUN_TEST(test_file_write);
  return UNITY_END();
}
