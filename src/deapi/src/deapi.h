#ifndef DEAPI_H
#define DEAPI_H

#include <stddef.h>

typedef struct __attribute__((packed)) {
  int width;
  int height;
} Rect;

typedef enum {
  TERMINAL = 0,
  FILE_MANAGER,
  EDITOR,
  OTHER,
} WindowType;

typedef struct __attribute__((packed)) {
  int id;
  WindowType type;
  int show;
} OpenWindow;

typedef struct __attribute__((packed)) {
  int length;
  OpenWindow *list;
} WindowList;

typedef struct __attribute__((packed)) {
  WindowType param; // parameter read
  int result;       // return value to be filled
} NewWindowSignature;

typedef struct __attribute__((packed)) {
  int id;
  int num0;
  int num1;
} Vec2WindowArgs;

#ifdef DEAPI_IMPL
const int sizeof_Rect = sizeof(Rect);
const int offsetof_Rect__width = offsetof(Rect, width);
const int offsetof_Rect__height = offsetof(Rect, height);
const int sizeof_OpenWindow = sizeof(OpenWindow);
const int offsetof_OpenWindow__id = offsetof(OpenWindow, id);
const int offsetof_OpenWindow__type = offsetof(OpenWindow, type);
const int offsetof_OpenWindow__show = offsetof(OpenWindow, show);
const int sizeof_WindowList = sizeof(WindowList);
const int offsetof_WindowList__length = offsetof(WindowList, length);
const int offsetof_WindowList__list = offsetof(WindowList, list);
const int sizeof_NewWindowSignature = sizeof(NewWindowSignature);
const int offsetof_NewWindowSignature__param = offsetof(NewWindowSignature, param);
const int offsetof_NewWindowSignature__result = offsetof(NewWindowSignature, result);
const int sizeof_Vec2WindowArgs = sizeof(Vec2WindowArgs);
const int offsetof_Vec2WindowArgs__id = offsetof(Vec2WindowArgs, id);
const int offsetof_Vec2WindowArgs__num0 = offsetof(Vec2WindowArgs, num0);
const int offsetof_Vec2WindowArgs__num1 = offsetof(Vec2WindowArgs, num1);
#endif

void deapi_init();
void deapi_deinit();

Rect window__area();
int window__open(WindowType type);
void window__hide(int id);
void window__show(int id);
void window__focus(int id);
void window__close(int id);
void window__move(int id, int x, int y);
int window__get_x(int id);
int window__get_y(int id);
void window__resize(int id, int width, int height);
int window__get_width(int id);
int window__get_height(int id);
WindowList window__list();

#endif
