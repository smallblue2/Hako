alias conf := reconfigure
alias srd := site-run-dev

default: build

build: exported-runtime
build-native: runtime-native
test: test-filesystem test-runtime

reconfigure: reconfigure-filesystem reconfigure-runtime

[working-directory('src/filesystem')]
reconfigure-filesystem:
  meson setup --cross-file ../emscripten.ini ../../build/filesystem --wipe

[working-directory('src/runtime')]
reconfigure-runtime: filesystem
  meson setup --cross-file ../emscripten.ini ../../build/runtime --wipe --force-fallback-for=lua

# Native compilation is used for running tests, just so we don't need to run
# them in a wasm + browser context
[working-directory('src/filesystem')]
reconfigure-filesystem-native:
  meson setup ../../build-native/filesystem --wipe

[working-directory('src/runtime')]
reconfigure-runtime-native: filesystem
  meson setup ../../build-native/runtime --wipe --force-fallback-for=lua

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

[working-directory('src/site')]
exported-runtime: runtime
  cp ../../build/runtime/runtime.js static/
  cp ../../build/runtime/runtime.wasm static/

[working-directory('src/site')]
site: exported-runtime
  deno run build

[working-directory('src/filesystem')]
test-filesystem: filesystem
  #!/bin/sh
  export NQDIR=../../build
  job=$(nq deno run start-server)
  deno run test
  kill ${job#*.}

test-runtime: runtime-native filesystem-native
  meson test -C build-native/runtime --print-errorlogs

[ working-directory('src/site')]
site-run-dev:
  deno run dev

clean:
  rm -rf build/filesystem
  rm -rf build/runtime
  rm -rf build-native/filesystem
  rm -rf build-native/runtime
  rm -rf build/site
