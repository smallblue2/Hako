alias conf := reconfigure
alias srd := site-run-dev

ncurses_version := "6.5"
libedit_version := "20250104-3.1"

default: build

build: exported-runtime
build-native: runtime-native
test: test-filesystem test-runtime test-processes test-integration

reconfigure: reconfigure-filesystem reconfigure-processes reconfigure-runtime

[working-directory('src/filesystem')]
reconfigure-filesystem:
  meson setup --cross-file ../emscripten.ini ../../build/filesystem

[working-directory('src/processes')]
reconfigure-processes:
  meson setup --cross-file ../emscripten.ini ../../build/processes

[working-directory('src/deapi')]
reconfigure-deapi:
  meson setup --cross-file ../emscripten.ini ../../build/deapi

[working-directory('src/runtime')]
reconfigure-runtime: processes filesystem deapi
  meson setup --cross-file ../emscripten.ini ../../build/runtime --wrap-mode=forcefallback

# Native compilation is used for running tests, just so we don't need to run them in a wasm + browser context
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

deapi:
  if [ ! -d build/deapi ]; then just reconfigure-deapi; fi
  ninja -C build/deapi

runtime-novendor:
  if [ ! -d build/runtime ]; then just reconfigure-runtime; fi
  ninja -C build/runtime

runtime: build-ncurses build-libedit
  just runtime-novendor

runtime-doc:
  ldoc src/runtime/doc/api.lua -d build/runtime/doc

processes:
  if [ ! -d build/processes ]; then just reconfigure-processes; fi
  ninja -C build/processes

exported-runtime: runtime runtime-doc
  just copy-static-files
 
[working-directory('src/site')]
copy-static-files:
  cp ../../build/runtime/runtime.mjs static/
  cp ../../build/runtime/runtime.wasm static/
  cp ../../build/runtime/signal.mjs static/
  cp ../../build/runtime/common.mjs static/
  cp ../../build/runtime/pipe.mjs static/
  cp ../../build/runtime/processTable.mjs static/
  cp ../../build/runtime/processManager.mjs static/
  cp ../../build/runtime/process.mjs static/
  cp ../../build/filesystem/api.mjs static/
  cp ../../build/filesystem/definitions.mjs static/
  cp ../../build/filesystem/filesystem.mjs static/
  cp ../../build/filesystem/filesystem.wasm static/
  cp ../glue/creflect.mjs static/
  cp -r ../../build/runtime/doc static/
  cp ../../docs/logos/hako_logo.png static/

[working-directory('src/runtime/vendor')]
build-ncurses:
  #!/bin/sh
  set -e
  if [ ! -d "ncurses" ]; then
    curl -LO https://ftp.gnu.org/gnu/ncurses/ncurses-{{ncurses_version}}.tar.gz
    curl -LO https://ftp.gnu.org/gnu/ncurses/ncurses-{{ncurses_version}}.tar.gz.sig
    curl -LO https://ftp.gnu.org/gnu/gnu-keyring.gpg
    gpg --verify --keyring ./gnu-keyring.gpg ncurses-{{ncurses_version}}.tar.gz.sig
    tar xf ncurses-{{ncurses_version}}.tar.gz
    mv ncurses-{{ncurses_version}} ncurses/
    rm ncurses-{{ncurses_version}}.tar.gz
    rm ncurses-{{ncurses_version}}.tar.gz.sig
  fi
  cd ncurses/
  if [ ! -f "lib/libncurses.a" ]; then
    CFLAGS="-pthread" emconfigure ./configure --host wasm32-unknown-emscripten --disable-widec
    emmake make -j4
  fi

[working-directory('src/runtime/vendor')]
build-libedit:
  #!/bin/sh
  set -e
  if [ ! -d "libedit" ]; then
    curl -LO https://www.thrysoee.dk/editline/libedit-{{libedit_version}}.tar.gz
    sha256sum -c libedit-20250104-3.1.tar.gz.sha256
    tar xf libedit-{{libedit_version}}.tar.gz
    mv libedit-{{libedit_version}} libedit/
    rm libedit-{{libedit_version}}.tar.gz
  fi
  cd libedit/
  if [ ! -f "libedit.a" ]; then
    LDFLAGS="-L$(realpath ../ncurses/lib/)" CFLAGS="-I$(realpath ../ncurses/include) -D__STDC_ISO_10646__ -pthread" emconfigure ./configure --host wasm32-unknown-emscripten
    emmake make -j4
    emar cru libedit.a src/chared.o src/chartype.o src/common.o src/eln.o src/el.o src/emacs.o src/filecomplete.o src/hist.o src/historyn.o src/history.o src/keymacro.o src/literal.o src/map.o src/parse.o src/prompt.o src/readline.o src/read.o src/reallocarr.o src/refresh.o src/search.o src/sig.o src/terminal.o src/tokenizern.o src/tokenizer.o src/tty.o src/unvis.o src/vi.o src/vis.o
  fi

[working-directory('src/site')]
site: exported-runtime
  deno run build

[working-directory('src/filesystem')]
test-filesystem: filesystem
  #!/bin/sh
  set -e
  export NQDIR=../../build
  job=$(nq npm run start-server)
  npm run test
  kill ${job#*.}

test-runtime: runtime-native
  #!/bin/sh
  set -e
  if meson test -C build-native/runtime --print-errorlogs; then
    cat build-native/runtime/meson-logs/testlog.txt && exit 0
  else
    cat build-native/runtime/meson-logs/testlog.txt && exit 1
  fi

[working-directory('src/processes')]
test-processes: processes
  #!/bin/sh
  set -e
  npm run test

[working-directory('src/')]
test-integration: runtime
  #!/bin/sh
  set -e
  npm run test

[working-directory('src/site')]
site-run-dev:
  deno run dev

clean:
  rm -rf build/
  rm -rf build-native/

clean-vendor:
  rm -rf src/runtime/vendor/ncurses
  rm -rf src/runtime/vendor/libedit
