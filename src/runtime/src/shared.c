#include "shared.h"
#include "lauxlib.h"
#include <string.h>
#include <assert.h>
#include <stdlib.h>
#include "../../processes/c/processes.h"
#include "../../filesystem/src/main.h"

// Not in mainline lua, but adapted from: https://github.com/luau-lang/luau/pull/221
bool checkboolean(lua_State *L, int narg) {
  if (!lua_isboolean(L, narg)) {
    luaL_typeerror(L, narg, lua_typename(L, LUA_TBOOLEAN));
    return false;
  }
  return lua_toboolean(L, narg);
}

// WARNING: Assumes null terminated array
void free_char_array(char **restrict array) {
  char **p = array;
  while (*p != NULL) {
    free(*p);
    p++;
  }
  free(array);
}

// Provides the length of a character array
int char_array_length(char **restrict array) {
  int len = 0;
  char **p = array;
  while (*p != NULL) {
    len++;
    p++;
  }
  return len;
}

char **split(const char *restrict string, const char delim) {
  int initial_size = 8;

  char **result = (char**)calloc(initial_size, sizeof(*result));
  if (!result) return NULL;

  int count = 0;
  const char *start = string;

  while (1) {
    // find the delimiter (of end of string)
    const char *end = strchr(start, delim);

    // Figure out substring length
    int length = end ? (int) (end - start) : (int) strlen(start);

    // Allocate space for substring + terminator
    char *sub = (char*)calloc(length + 1, sizeof(char));
    if (!sub) {
      // TODO: free everything so far
      free_char_array(result);
      return NULL;
    }
    memcpy(sub, start, length * sizeof(char));
    *(sub + length) = '\0';

    if (count == initial_size - 1) {
      // Need more capacity
      initial_size *= 2;
      char **tmp = realloc(result, initial_size * sizeof(*result));
      if (!tmp) {
        free_char_array(result);
        return NULL;
      }
      result = tmp;
    }
    *(result + count++) = sub;

    if (!end) {
      break;
    }

    // Move past the delimeter
    start = end + 1;
  }

  // Null terminate array
  *(result + count) = NULL;
  return result;
}

void print_char_array(char **restrict array) {
  int i = 0;
  char **pos = array;
  while (*pos != NULL) {
    printf("%d: %s\n", i, *pos);
    i++;
    pos++;
  }
}

char *join_paths(const char *restrict path1, const char *restrict path2) {
  int path_size1 = strlen(path1);
  int delim = 0;

  if (*path2 != '/') {
    delim = 1;
  }
  
  int path_size2 = strlen(path2);

  char *joined_string = (char*)calloc(path_size1 + delim + path_size2 + 1, sizeof(char));
  if (joined_string == NULL) return NULL;
  char *copy_dest = joined_string;
  memcpy(copy_dest, path1, path_size1 * sizeof(char));

  copy_dest += path_size1;
  if (delim == 1) {
    *copy_dest = '/';
    copy_dest++;
  }

  memcpy(copy_dest, path2, path_size2 * sizeof(char));
  copy_dest += path_size2;
  *copy_dest = '\0';

  return joined_string;
}

char_stack *char_stack_create(int capacity) {
  if (capacity < 1) capacity = 1;
  char_stack *stack = (char_stack*)calloc(1, sizeof(char_stack));
  stack->capacity = capacity;
  stack->top_index = -1;
  stack->array = (char**)calloc(capacity, sizeof(char*));
  return stack;
}

void char_stack_free(char_stack *restrict stack) {
  if (stack == NULL) return;
  char **p = stack->array;
  while (*p != NULL) {
    free(*p);
    p++;
  }
  if (stack->array != NULL) free(stack->array);
  stack->capacity=0;
  stack->top_index=-1;
  free(stack);
}

int char_stack_add(char_stack *restrict stack, char *restrict item) {
  if (stack == NULL || item == NULL) return 1;
  int item_length = strlen(item);
  char *store = calloc(item_length + 1, sizeof(char));
  if (store == NULL) return 1;
  memcpy(store, item, item_length);
  *(store + item_length) = '\0';

  if (stack->top_index == stack->capacity - 1) {
    stack->capacity *= 2;
    char **new_array = realloc(stack->array, stack->capacity * sizeof(char*));
    if (new_array == NULL) {
      free(store);
      return 1;
    }
    stack->array = new_array;
  }

  stack->top_index++;

  *(stack->array + stack->top_index) = store;
  *(stack->array + stack->top_index + 1)  = NULL;
  return 0;
}

char *char_stack_pop(char_stack *restrict stack) {
  if (stack == NULL || stack->top_index < 0) return NULL;
  char *item = *(stack->array + stack->top_index);
  *(stack->array + stack-> top_index) = NULL;
  stack->top_index--;
  return item;
}

char *char_stack_peek(char_stack *restrict stack) {
  if (stack == NULL || stack->top_index < 0) return NULL;
  return *(stack->array + stack->top_index);
}

void char_stack_print(char_stack *restrict stack) {
  char **ptr = stack->array;
  int i = 0;
  printf("BOTTOM\n");
  while (*ptr != NULL) {
    printf("%d: %s\n", i, *ptr);
    ptr++;
    i++;
  }
  printf("TOP\n");
}

char *char_stack_join(char_stack *restrict stack, const char delim) {
  if (stack == NULL || stack->top_index < 0) return NULL;

  int total_len = 0;
  int num_elems = 0;
  for (char **cur = stack->array; *cur != NULL; cur++) {
    total_len += strlen(*cur);
    num_elems++;
  }

  if (num_elems > 1) {
    total_len += (num_elems - 1);
  }

  char *joined = calloc(total_len + 1, sizeof(char));
  if (joined == NULL) return NULL;
  // Start with an empty string
  *joined = '\0';

  int offset = 0;
  int i = 0;
  for (char **cur = stack->array; *cur != NULL; cur++, i++) {
    int len = strlen(*cur);
    memcpy(joined + offset, *cur, len);
    offset += len;

    if (i < num_elems - 1) {
      *(joined + offset) = delim;
      offset++;
    }
  }

  *(joined + offset) = '\0';
  return joined;
}

int normalise_path_into_char_stack(char_stack *restrict stack, char **restrict array) {
    // Iterate over the split array
  char **start = array;
  while (*start != NULL) {
    // If '..', pop from the stack and don't add '..'
    if (strcmp(*start, "..") == 0) {
      char *popped = char_stack_pop(stack);
      if (popped != NULL) free(popped);
    // If not '.', '', or 'FALSE_ROOT_NAME' add to the stack
    } else if (strcmp(*start, ".") != 0 && strcmp(*start, "") != 0 && strcmp(*start, FALSE_ROOT_NAME) != 0) {
      int ret = char_stack_add(stack, *start);
      if (ret) {
        return 1;
      }
    }
    // Move to the next element
    start++;
  }

  return 0;
}

char *fake_path(const char *restrict path) {
#ifndef __EMSCRIPTEN__
  // Tests run natively, but return is still expected to be owned
  // (sorry for strdup :( )
  return strdup(path);
#endif

  // Create stack
  char_stack *stack = char_stack_create(4);

  // If it's a relative path, fill the stack with the CWD first
  if (*path != '/') {
    Error err;
    char *cwd = file__cwd(&err);
    if (cwd == NULL) {
      char_stack_free(stack);
      return NULL;
    }

    char **split_array = split(cwd, '/');
    free(cwd);
    if (split_array == NULL) {
      char_stack_free(stack);
      return NULL;
    }
    int ret = normalise_path_into_char_stack(stack, split_array);
    free_char_array(split_array);
    if (ret) {
      char_stack_free(stack);
      free_char_array(split_array);
      return NULL;
    }
  }

  // Split the path
  char **split_array = split(path, '/');
  if (split_array == NULL) {
    char_stack_free(stack);
    return NULL;
  }
  int ret = normalise_path_into_char_stack(stack, split_array);
  free_char_array(split_array);
  if (ret) {
    char_stack_free(stack);
    return NULL;
  }

  // Join the remaining stack elements together with '/'
  char *normalised_path = char_stack_join(stack, '/');
  // normalised_path only fails if the stack is empty
  // Set it to an empty string if this is the case
  if (normalised_path == NULL) {
    normalised_path = calloc(1, sizeof(char));
    *normalised_path = '\0';
  }

  // Join the false root to the normalised path
  char *fake_path = join_paths(FALSE_ROOT, normalised_path);

  // Cleanup
  free(normalised_path);
  char_stack_free(stack);  
  return fake_path;
}

