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
#endif

void deapi_init();
void deapi_deinit();

Rect window__area();
WindowList window__list();
void window__hide(int id);

#endif
