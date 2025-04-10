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

EM_JS(void, _window__hide, (void *data), {
  const id = getValue(data, 'i32');
  window.deapi.windowHide(id);
})

Rect window__area() { PROXY_NO_ARGS(Rect, rect, _window__area); }
WindowList window__list() { PROXY_NO_ARGS(WindowList, list, _window__list); }
void window__hide(int id) { PROXY_CALL(_window__hide, &id); }

void deapi_deinit() {
  em_proxying_queue_destroy(proxy_queue);
  proxy_queue = NULL;
}
