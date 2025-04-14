#ifndef SHARED_H
#define SHARED_H

#include <lua.h>
#include <stdbool.h>
#include <unistd.h>

#define FALSE_ROOT "/persistent"
#define FALSE_ROOT_NAME "persistent"
#define FALSE_ROOT_SIZE sizeof(FALSE_ROOT) - 1

bool checkboolean(lua_State *L, int narg);

char *join_paths(const char *path1, const char *path2);
char **split(const char *string, const char delim);

void print_char_array(char **array);
void free_char_array(char **array);
int char_array_length(char **array);

typedef struct {
  int capacity;
  int top_index;
  char **array;
} char_stack;

char_stack *char_stack_create(int capacity);
void char_stack_free(char_stack *stack);
int char_stack_add(char_stack *stack, char *item);
char *char_stack_pop(char_stack *stack);
char *char_stack_peek(char_stack *stack);
void char_stack_print(char_stack *stack);
char *char_stack_join(char_stack *stack, const char delim);
int normalise_path_into_char_stack(char_stack *stack, char **array);

char *fake_path(const char *path);

#endif
