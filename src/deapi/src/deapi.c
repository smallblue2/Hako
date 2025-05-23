#define DEAPI_IMPL
#include "deapi.h"
#include "emscripten/proxying.h"
#include "emscripten/threading.h"
#include "emscripten/em_asm.h"
#include <stdio.h>

static pthread_t main_thread_id;
static em_proxying_queue *proxy_queue = NULL;

void deapi_init() {
   main_thread_id = emscripten_main_runtime_thread_id();
   proxy_queue = em_proxying_queue_create();
}

#define PROXY_CALL(func, arg) \
  emscripten_proxy_sync(proxy_queue, main_thread_id, func, arg); \
  emscripten_proxy_execute_queue(proxy_queue); \

// Helper macro to call given function to yield result type bound to provided name identifier
#define PROXY_NO_ARGS(T, name, func) \
  T name; \
  PROXY_CALL(func, &name); \
  return name; \

EM_JS(void, _window__area, (void *data), {
  const refl = window.deapi.creflect;
  let view = new refl.StructView(Module, "Rect", data);
  view.width = parseInt(window.innerWidth.toString());
  view.height = parseInt(window.innerHeight);
})

EM_JS(void, _window__list, (void *data), {
  const refl = window.deapi.creflect;
  const windows = window.deapi.windowList();
  const size = refl.sizeof(Module, "OpenWindow");
  const bufPtr = _malloc(windows.length * size);
  let i = 0;
  for (const w of windows) {
    let view = new refl.StructView(Module, "OpenWindow", bufPtr + (i * size));
    view.id = w.id;
    view.type = w.type;
    view.show = w.show;
    i++;
  }
  let view = new refl.StructView(Module, "WindowList", data);
  view.list = bufPtr;
  view.length = windows.length;
})

EM_JS(void, _window__open, (void *data), {
  let view = new window.deapi.creflect.StructView(Module, "NewWindowSignature", data);
  view.result = window.deapi.windowOpen(view.param);
})

EM_JS(void, _window__hide, (void *data), {
  const id = getValue(data, 'i32');
  window.deapi.windowHide(id);
})

EM_JS(void, _window__show, (void *data), {
  const id = getValue(data, 'i32');
  window.deapi.windowShow(id);
})

EM_JS(void, _window__focus, (void *data), {
  const id = getValue(data, 'i32');
  window.deapi.windowFocus(id);
})

EM_JS(void, _window__get_x, (void *data), {
  const id = getValue(data, 'i32');
  setValue(data, window.deapi.windowGetX(id), 'i32');
})

EM_JS(void, _window__get_y, (void *data), {
  const id = getValue(data, 'i32');
  setValue(data, window.deapi.windowGetY(id), 'i32');
})

EM_JS(void, _window__move, (void *data), {
  const refl = window.deapi.creflect;
  const view = new refl.StructView(Module, "Vec2WindowArgs", data);
  window.deapi.windowMove(view.id, view.num0, view.num1);
})

EM_JS(void, _window__get_width, (void *data), {
  const id = getValue(data, 'i32');
  setValue(data, window.deapi.windowGetWidth(id), 'i32');
})

EM_JS(void, _window__get_height, (void *data), {
  const id = getValue(data, 'i32');
  setValue(data, window.deapi.windowGetHeight(id), 'i32');
})

EM_JS(void, _window__resize, (void *data), {
  const refl = window.deapi.creflect;
  const view = new refl.StructView(Module, "Vec2WindowArgs", data);
  window.deapi.windowResize(view.id, view.num0, view.num1);
})

EM_JS(void, _window__close, (void *data), {
  const id = getValue(data, 'i32');
  window.deapi.windowClose(id);
})

Rect window__area() { PROXY_NO_ARGS(Rect, rect, _window__area); }
int window__open(WindowType type) {
  NewWindowSignature signature = { .param = type };
  PROXY_CALL(_window__open, &signature);
  return signature.result;
}
void window__hide(int id) { PROXY_CALL(_window__hide, &id); }
void window__show(int id) { PROXY_CALL(_window__show, &id); }
void window__focus(int id) { PROXY_CALL(_window__focus, &id); }
void window__close(int id) { PROXY_CALL(_window__close, &id); }
int window__get_x(int id) {
  PROXY_CALL(_window__get_x, &id);
  return id;
}
int window__get_y(int id) {
  PROXY_CALL(_window__get_y, &id);
  return id;
}
void window__move(int id, int x, int y) {
  Vec2WindowArgs moveWindow = { .id = id, .num0 = x, .num1 = y };
  PROXY_CALL(_window__move, &moveWindow);
}
int window__get_width(int id) {
  PROXY_CALL(_window__get_width, &id);
  return id;
}
int window__get_height(int id) {
  PROXY_CALL(_window__get_height, &id);
  return id;
}
void window__resize(int id, int width, int height) {
  Vec2WindowArgs resizeWindow = { .id = id, .num0 = width, .num1 = height };
  PROXY_CALL(_window__resize, &resizeWindow);
}
WindowList window__list() { PROXY_NO_ARGS(WindowList, list, _window__list); }

void deapi_deinit() {
  em_proxying_queue_destroy(proxy_queue);
  proxy_queue = NULL;
}
