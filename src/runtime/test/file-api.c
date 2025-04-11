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
static struct stat sb = {0};

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

void test_file_write_and_read(void) {
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

void test_file_read_all(void) {
  TEST_ASSERT_MESSAGE(L != NULL, "Lua is not initialized properly");
  int top = lua_gettop(L);

  snprintf(static_fmt_buf, STATIC_FMT_SIZE,
      "local fd, err = file.open('/tmp/%d-file-read-all', 'rwc')\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "local err = file.write(fd, 'Hello, world')\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "file.close(fd)\n"
      "fd = file.open('/tmp/%d-file-read-all', 'r')\n"
      "local res, err = file.read_all(fd)\n"
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

void test_file_shift(void) {
  TEST_ASSERT_MESSAGE(L != NULL, "Lua is not initialized properly");
  int top = lua_gettop(L);

  snprintf(static_fmt_buf, STATIC_FMT_SIZE,
      "local fd, err = file.open('/tmp/%d-file-shift', 'rwc')\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "local err = file.write(fd, 'Hello, world')\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "file.close(fd)\n"
      "fd = file.open('/tmp/%d-file-shift', 'r')\n"
      "file.shift(fd, 3)\n"
      "local res, err = file.read_all(fd)\n"
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
  TEST_ASSERT_EQUAL_STRING_MESSAGE("lo, world", lua_tostring(L, -1), "Written contents are different from what is expected");

  lua_settop(L, top);
}

void test_file_jump(void) {
  TEST_ASSERT_MESSAGE(L != NULL, "Lua is not initialized properly");
  int top = lua_gettop(L);

  snprintf(static_fmt_buf, STATIC_FMT_SIZE,
      "local fd, err = file.open('/tmp/%d-file-goto', 'rwc')\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "local err = file.write(fd, 'Hello, world')\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "file.close(fd)\n"
      "fd = file.open('/tmp/%d-file-goto', 'r')\n"
      "local err = file.jump(fd, 5)\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "local res, err = file.read_all(fd)\n"
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
  TEST_ASSERT_EQUAL_STRING_MESSAGE(", world", lua_tostring(L, -1), "Written contents are different from what is expected");

  lua_settop(L, top);
}

void test_file_remove(void) {
  TEST_ASSERT_MESSAGE(L != NULL, "Lua is not initialized properly");
  int top = lua_gettop(L);

  snprintf(static_fmt_buf, STATIC_FMT_SIZE,
      "local fd, err = file.open('/tmp/%d-file-remove', 'rwc')\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "file.close(fd)\n"
      "local err = file.remove('/tmp/%d-file-remove')\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "return 0", unique_test_id, unique_test_id);
  if (LUA_OK != luaL_dostring(L, static_fmt_buf)) {
    const char *err = lua_tostring(L, -1);
    fprintf(stderr, "lua code failed to run: %s\n", err);
    TEST_FAIL();
  }
  TEST_ASSERT_EQUAL_INT_MESSAGE(LUA_TNUMBER, lua_type(L, -1), "expected to get integer result");
  TEST_ASSERT_EQUAL_INT_MESSAGE(0, lua_tonumber(L, -1), "api function returned an error code");

  snprintf(static_fmt_buf, STATIC_FMT_SIZE, "/tmp/%d-file-remove", unique_test_id);

  // Check that the file does not exist
  TEST_ASSERT_MESSAGE(stat(static_fmt_buf, &sb) != 0, "Expected file to not exist");

  lua_settop(L, top);
}

void test_file_move(void) {
  TEST_ASSERT_MESSAGE(L != NULL, "Lua is not initialized properly");
  int top = lua_gettop(L);

  snprintf(static_fmt_buf, STATIC_FMT_SIZE,
      "local fd, err = file.open('/tmp/%d-file-move0', 'rwc')\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "file.close(fd)\n"
      "local err = file.move('/tmp/%d-file-move0', '/tmp/%d-file-move1')\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "return 0", unique_test_id, unique_test_id, unique_test_id);
  if (LUA_OK != luaL_dostring(L, static_fmt_buf)) {
    const char *err = lua_tostring(L, -1);
    fprintf(stderr, "lua code failed to run: %s\n", err);
    TEST_FAIL();
  }
  TEST_ASSERT_EQUAL_INT_MESSAGE(LUA_TNUMBER, lua_type(L, -1), "expected to get integer result");
  TEST_ASSERT_EQUAL_INT_MESSAGE(0, lua_tonumber(L, -1), "api function returned an error code");

  snprintf(static_fmt_buf, STATIC_FMT_SIZE, "/tmp/%d-file-move0", unique_test_id);

  // Check that the file does not exist
  TEST_ASSERT_MESSAGE(stat(static_fmt_buf, &sb) != 0, "Expected file to not exist");

  snprintf(static_fmt_buf, STATIC_FMT_SIZE, "/tmp/%d-file-move1", unique_test_id);

  // Check that the file does exist
  TEST_ASSERT_MESSAGE(stat(static_fmt_buf, &sb) == 0, "Expected file to exist");

  lua_settop(L, top);
}

void test_file_make_dir(void) {
  TEST_ASSERT_MESSAGE(L != NULL, "Lua is not initialized properly");
  int top = lua_gettop(L);

  snprintf(static_fmt_buf, STATIC_FMT_SIZE,
      "local err = file.make_dir('/tmp/%d-file-make-dir')\n"
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
  TEST_ASSERT_EQUAL_INT_MESSAGE(0, lua_tonumber(L, -1), "api function returned an error code");

  snprintf(static_fmt_buf, STATIC_FMT_SIZE, "/tmp/%d-file-make-dir", unique_test_id);

  // Check that the file does exist
  TEST_ASSERT_MESSAGE(stat(static_fmt_buf, &sb) == 0, "Expected directory to exist");
  TEST_ASSERT_MESSAGE(S_ISDIR(sb.st_mode) != 0, "Expected it to be a directory");

  lua_settop(L, top);
}

void test_file_remove_dir(void) {
  TEST_ASSERT_MESSAGE(L != NULL, "Lua is not initialized properly");
  int top = lua_gettop(L);

  snprintf(static_fmt_buf, STATIC_FMT_SIZE,
      "local err = file.make_dir('/tmp/%d-file-remove-dir')\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "err = file.remove_dir('/tmp/%d-file-remove-dir')\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "return 0", unique_test_id, unique_test_id);
  if (LUA_OK != luaL_dostring(L, static_fmt_buf)) {
    const char *err = lua_tostring(L, -1);
    fprintf(stderr, "lua code failed to run: %s\n", err);
    TEST_FAIL();
  }
  TEST_ASSERT_EQUAL_INT_MESSAGE(LUA_TNUMBER, lua_type(L, -1), "expected to get integer result");
  TEST_ASSERT_EQUAL_INT_MESSAGE(0, lua_tonumber(L, -1), "api function returned an error code");

  snprintf(static_fmt_buf, STATIC_FMT_SIZE, "/tmp/%d-file-remove-dir", unique_test_id);

  // Check that the file does exist
  TEST_ASSERT_MESSAGE(stat(static_fmt_buf, &sb) != 0, "Expected directory not to exist");

  lua_settop(L, top);
}

void test_file_change_dir(void) {
  TEST_ASSERT_MESSAGE(L != NULL, "Lua is not initialized properly");
  int top = lua_gettop(L);

  snprintf(static_fmt_buf, STATIC_FMT_SIZE,
      "local err = file.change_dir('/tmp')\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "local fd, err = file.open('%d-file-change-dir', 'rwc')\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "file.close(fd)\n"
      "return 0", unique_test_id);
  if (LUA_OK != luaL_dostring(L, static_fmt_buf)) {
    const char *err = lua_tostring(L, -1);
    fprintf(stderr, "lua code failed to run: %s\n", err);
    TEST_FAIL();
  }
  TEST_ASSERT_EQUAL_INT_MESSAGE(LUA_TNUMBER, lua_type(L, -1), "expected to get integer result");
  TEST_ASSERT_EQUAL_INT_MESSAGE(0, lua_tonumber(L, -1), "api function returned an error code");

  snprintf(static_fmt_buf, STATIC_FMT_SIZE, "/tmp/%d-file-change-dir", unique_test_id);

  // Check that the file does exist
  TEST_ASSERT_MESSAGE(stat(static_fmt_buf, &sb) == 0, "Expected file to exist");

  lua_settop(L, top);
}

void test_file_read_dir(void) {
  TEST_ASSERT_MESSAGE(L != NULL, "Lua is not initialized properly");
  int top = lua_gettop(L);

  snprintf(static_fmt_buf, STATIC_FMT_SIZE,
      "local entries, err = file.read_dir('/tmp')\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "if #entries == 0 then\n"
      " return ''\n"
      "end\n"
      "return 0");
  if (LUA_OK != luaL_dostring(L, static_fmt_buf)) {
    const char *err = lua_tostring(L, -1);
    fprintf(stderr, "lua code failed to run: %s\n", err);
    TEST_FAIL();
  }
  TEST_ASSERT_EQUAL_INT_MESSAGE(LUA_TNUMBER, lua_type(L, -1), "Expected read_dir to return some entries when reading /tmp");
  TEST_ASSERT_EQUAL_INT_MESSAGE(0, lua_tonumber(L, -1), "api function returned an error code");

  lua_settop(L, top);
}

void test_file_stat(void) {
  TEST_ASSERT_MESSAGE(L != NULL, "Lua is not initialized properly");
  int top = lua_gettop(L);

  snprintf(static_fmt_buf, STATIC_FMT_SIZE,
      "local fd, err = file.open('/tmp/%d-file-stat', 'wc')\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "err = file.write(fd, 'Hello, world')\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "err = file.close(fd)\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "local st, err = file.stat('/tmp/%d-file-stat')\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "if st.size ~= 12 then\n"
      "  return ''\n"
      "end\n"
      "_ = st.blocksize\n"
      "_ = st.ino\n"
      "_ = st.perm\n"
      "_ = st.atime.sec\n"
      "_ = st.atime.nsec\n"
      "_ = st.mtime.sec\n"
      "_ = st.mtime.nsec\n"
      "_ = st.ctime.sec\n"
      "_ = st.ctime.nsec\n"
      "return 0", unique_test_id, unique_test_id);
  if (LUA_OK != luaL_dostring(L, static_fmt_buf)) {
    const char *err = lua_tostring(L, -1);
    fprintf(stderr, "lua code failed to run: %s\n", err);
    TEST_FAIL();
  }
  TEST_ASSERT_EQUAL_INT_MESSAGE(LUA_TNUMBER, lua_type(L, -1), "the size reported by file.stat is incorrect");
  TEST_ASSERT_EQUAL_INT_MESSAGE(0, lua_tonumber(L, -1), "api function returned an error code");

  lua_settop(L, top);
}

void test_file_fdstat(void) {
  TEST_ASSERT_MESSAGE(L != NULL, "Lua is not initialized properly");
  int top = lua_gettop(L);

  snprintf(static_fmt_buf, STATIC_FMT_SIZE,
      "local fd, err = file.open('/tmp/%d-file-fdstat', 'wc')\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "err = file.write(fd, 'Hello, world')\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "local st, err = file.fdstat(fd)\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "if st.size ~= 12 then\n"
      "  return ''\n"
      "end\n"
      "_ = st.blocksize\n"
      "_ = st.ino\n"
      "_ = st.perm\n"
      "_ = st.atime.sec\n"
      "_ = st.atime.nsec\n"
      "_ = st.mtime.sec\n"
      "_ = st.mtime.nsec\n"
      "_ = st.ctime.sec\n"
      "_ = st.ctime.nsec\n"
      "return 0", unique_test_id);
  if (LUA_OK != luaL_dostring(L, static_fmt_buf)) {
    const char *err = lua_tostring(L, -1);
    fprintf(stderr, "lua code failed to run: %s\n", err);
    TEST_FAIL();
  }
  TEST_ASSERT_EQUAL_INT_MESSAGE(LUA_TNUMBER, lua_type(L, -1), "the size reported by file.stat is incorrect");
  TEST_ASSERT_EQUAL_INT_MESSAGE(0, lua_tonumber(L, -1), "api function returned an error code");

  lua_settop(L, top);
}

void test_file_permit(void) {
  TEST_ASSERT_MESSAGE(L != NULL, "Lua is not initialized properly");
  int top = lua_gettop(L);

  snprintf(static_fmt_buf, STATIC_FMT_SIZE,
      "local fd, err = file.open('/tmp/%d-file-permit', 'c')\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "err = file.permit('/tmp/%d-file-permit', 'rw')\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "local st, err = file.fdstat(fd)\n"
      "if err ~= nil then\n"
        "return err\n"
      "end\n"
      "if st.perm ~= 'rw' then\n"
      " return ''\n"
      "end\n"
      "return 0", unique_test_id, unique_test_id);
  if (LUA_OK != luaL_dostring(L, static_fmt_buf)) {
    const char *err = lua_tostring(L, -1);
    fprintf(stderr, "lua code failed to run: %s\n", err);
    TEST_FAIL();
  }
  TEST_ASSERT_EQUAL_INT_MESSAGE(LUA_TNUMBER, lua_type(L, -1), "the permissions are wrong");
  TEST_ASSERT_EQUAL_INT_MESSAGE(0, lua_tonumber(L, -1), "api function returned an error code");

  lua_settop(L, top);
}

void test_file_truncate(void) {
  TEST_ASSERT_MESSAGE(L != NULL, "Lua is not initialized properly");
  int top = lua_gettop(L);

  snprintf(static_fmt_buf, STATIC_FMT_SIZE,
      "local fd, err = file.open('/tmp/%d-file-truncate', 'rwc')\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "err = file.write(fd, 'Hello, world!')"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "err = file.truncate(fd, 4)\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "err = file.jump(fd, 0)\n"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "local rr, err = file.read_all(fd)"
      "if err ~= nil then\n"
      "  return err\n"
      "end\n"
      "if rr ~= 'Hell' then\n"
      "  return ''"
      "end\n"
      "return 0", unique_test_id);
  if (LUA_OK != luaL_dostring(L, static_fmt_buf)) {
    const char *err = lua_tostring(L, -1);
    fprintf(stderr, "lua code failed to run: %s\n", err);
    TEST_FAIL();
  }

  TEST_ASSERT_EQUAL_INT_MESSAGE(LUA_TNUMBER, lua_type(L, -1), "contents of file were not as expected");
  TEST_ASSERT_EQUAL_INT_MESSAGE(0, lua_tonumber(L, -1), "api function returned an error code");

  lua_settop(L, top);
}

int main(void) {
  UNITY_BEGIN();
  RUN_TEST(test_file_open);
  RUN_TEST(test_file_close);
  RUN_TEST(test_file_write_and_read);
  RUN_TEST(test_file_read_all);
  RUN_TEST(test_file_shift);
  RUN_TEST(test_file_jump);
  RUN_TEST(test_file_remove);
  RUN_TEST(test_file_move);
  RUN_TEST(test_file_make_dir);
  RUN_TEST(test_file_remove_dir);
  RUN_TEST(test_file_change_dir);
  RUN_TEST(test_file_read_dir);
  RUN_TEST(test_file_stat);
  RUN_TEST(test_file_fdstat);
  RUN_TEST(test_file_permit);
  RUN_TEST(test_file_truncate);
  return UNITY_END();
}
