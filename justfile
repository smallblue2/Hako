alias conf := reconfigure

default: build

build: site
native: runtime
test: test-filesystem

reconfigure: reconfigure-filesystem reconfigure-runtime

[working-directory('src/filesystem')]
reconfigure-filesystem:
  meson setup --cross-file ../emscripten.ini ../../build/filesystem --wipe

[working-directory('src/runtime')]
reconfigure-runtime: filesystem
  meson setup --cross-file ../emscripten.ini ../../build/runtime --wipe

filesystem:
  if [ ! -d build/filesystem ]; then just reconfigure-filesystem; fi
  ninja -C build/filesystem

runtime:
  if [ ! -d build/runtime ]; then just reconfigure-runtime; fi
  ninja -C build/runtime

[working-directory('src/site')]
site: runtime
  cp ../../build/runtime/runtime.js static/
  cp ../../build/runtime/runtime.wasm static/
  deno run build

[working-directory('src/filesystem')]
test-filesystem: filesystem
  #!/bin/sh
  export NQDIR=../../build
  job=$(nq deno run start-server)
  deno run test
  kill ${job#*.}

clean:
  rm -rf build/filesystem
  rm -rf build/runtime
  rm -rf build/site
