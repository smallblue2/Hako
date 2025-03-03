alias conf := reconfigure
alias srd := site-run-dev

default: build

build: exported-runtime
build-native: runtime-native
test: test-filesystem test-runtime test-processes

reconfigure: reconfigure-filesystem reconfigure-processes reconfigure-runtime

[working-directory('src/filesystem')]
reconfigure-filesystem:
  meson setup --cross-file ../emscripten.ini ../../build/filesystem

[working-directory('src/processes')]
reconfigure-processes:
  meson setup --cross-file ../emscripten.ini ../../build/processes

[working-directory('src/runtime')]
reconfigure-runtime: processes filesystem
  meson setup --cross-file ../emscripten.ini ../../build/runtime --wrap-mode=forcefallback

# Native compilation is used for running tests, just so we don't need to run
# them in a wasm + browser context
[working-directory('src/filesystem')]
reconfigure-filesystem-native:
  meson setup ../../build-native/filesystem

[working-directory('src/runtime')]
reconfigure-runtime-native: filesystem
  meson setup ../../build-native/runtime --wrap-mode=forcefallback

filesystem-native:
  if [ ! -d build-native/filesystem ]; then just reconfigure-filesystem-native; fi
  ninja -C build-native/filesystem

runtime-native: filesystem-native
  if [ ! -d build-native/runtime ]; then just reconfigure-runtime-native; fi
  ninja -C build-native/runtime

filesystem:
  if [ ! -d build/filesystem ]; then just reconfigure-filesystem; fi
  ninja -C build/filesystem

runtime:
  if [ ! -d build/runtime ]; then just reconfigure-runtime; fi
  ninja -C build/runtime

processes:
  if [ ! -d build/processes ]; then just reconfigure-processes; fi
  ninja -C build/processes

[working-directory('src/site')]
exported-runtime: runtime
  cp ../../build/runtime/runtime.js static/
  cp ../../build/runtime/runtime.wasm static/

  cp ../../build/runtime/runtime.js static/
  cp ../../build/runtime/runtime.wasm static/

  cp ../../build/runtime/signal.js static/
  cp ../../build/runtime/common.js static/
  cp ../../build/runtime/pipe.js static/
  cp ../../build/runtime/processTable.js static/
  cp ../../build/runtime/processManager.js static/
  cp ../../build/runtime/process.js static/


[working-directory('src/site')]
site: exported-runtime
  deno run build

[working-directory('src/filesystem')]
test-filesystem: filesystem
  #!/bin/sh
  export NQDIR=../../build
  job=$(nq npm run start-server)
  npm run test
  kill ${job#*.}

test-runtime: runtime-native
  meson test -C build-native/runtime --print-errorlogs

[working-directory('src/processes')]
test-processes: processes
  #!/bin/sh
  npm run test

[working-directory('src/site')]
site-run-dev:
  deno run dev

clean:
  rm -rf build/
  rm -rf build-native/
