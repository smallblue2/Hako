alias conf := reconfigure
alias srd := site-run-dev

default: build

build: exported-runtime
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

[working-directory('src/site')]
site-run-dev:
  deno run dev

clean:
  rm -rf build/filesystem
  rm -rf build/runtime
  rm -rf build/site
