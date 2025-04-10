project('runtime', 'c',
  version : '0.1',
  default_options : ['warning_level=3', 'default_library=static', 'werror=true'])

if host_machine.system() == 'emscripten'
  configure_file(input: 'js/emscripten-pty.js', output: 'emscripten-pty.js', copy: true)
  configure_file(input: 'js/pre.js', output: 'pre.js', copy: true)
  configure_file(input: 'js/post.js', output: 'post.js', copy: true)
  configure_file(input: 'xterm-256color.terminfo', output: 'xterm-256color.terminfo', copy: true)
  configure_file(input: 'vendor/ncurses/lib/libncurses.a', output: 'libncurses.a', copy: true)
  configure_file(input: 'vendor/libedit/libedit.a', output: 'libedit.a', copy: true)
endif

if host_machine.system() == 'emscripten'
  configure_file(input: '../../build/deapi/libdeapi.a', output: 'libdeapi.a', copy: true)
  configure_file(input: '../../build/filesystem/libfilesystem.a', output: 'libfilesystem.a', copy: true)
  configure_file(input: '../../build/processes/libprocesses.a', output: 'libprocesses.a', copy: true)
  configure_file(input: '../../build/processes/signal.mjs', output: 'signal.mjs', copy: true)
  configure_file(input: '../../build/processes/common.mjs', output: 'common.mjs', copy: true)
  configure_file(input: '../../build/processes/pipe.mjs', output: 'pipe.mjs', copy: true)
  configure_file(input: '../../build/processes/processTable.mjs', output: 'processTable.mjs', copy: true)
  configure_file(input: '../../build/processes/processManager.mjs', output: 'processManager.mjs', copy: true)
  configure_file(input: '../../build/processes/process.mjs', output: 'process.mjs', copy: true)
  configure_file(input: '../../build/filesystem/api.mjs', output: 'api.mjs', copy: true)
  configure_file(input: '../../build/filesystem/definitions.mjs', output: 'definitions.mjs', copy: true)
  configure_file(input: '../../build/filesystem/filesystem.mjs', output: 'filesystem.mjs', copy: true)
  configure_file(input: '../../build/filesystem/filesystem.wasm', output: 'filesystem.wasm', copy: true)
else
  configure_file(input: '../../build-native/filesystem/libfilesystem.a', output: 'libfilesystem.a', copy: true)
endif

if host_machine.system() == 'emscripten'
  add_global_arguments('-pthread', language: 'c')
endif

lua_dep = dependency('lua', static: true, default_options: ['line_editing=disabled'])

# Copy static directory - this is used for static asset files in emscripten
custom_target('copy_static_dir',
  command: ['cp', '-r', meson.project_source_root() / 'static', meson.project_build_root() / 'static'],
  output: 'dummy.txt',
  build_by_default: true
)
 
if host_machine.system() == 'emscripten'
  sources = files('src/main.c', 'src/file.c', 'src/errors.c', 'src/process.c', 'src/shared.c', 'src/terminal.c', 'src/window.c')
  executable('runtime', sources, name_suffix: 'mjs', c_args: ['-std=gnu2x', '-Os', '-Wall', '-Wextra', '-pthread'], link_args: ['-lproxyfs.js', 'libedit.a', 'libncurses.a', 'libfilesystem.a', 'libdeapi.a', '-Wl,--whole-archive', 'libprocesses.a', '-pthread', '--post-js=post.js', '--pre-js=pre.js', '--js-library=emscripten-pty.js', '-sSHARED_MEMORY=1', '-sPROXY_TO_PTHREAD', '-sEXPORT_ES6', '-sENVIRONMENT=web,worker', '-sEXPORTED_RUNTIME_METHODS=stringToUTF8,UTF8ToString,stringToNewUTF8,setValue,wasmMemory,getValue', '-sEXPORTED_FUNCTIONS=_malloc,_sizeof_Rect,_offsetof_Rect__width,_offsetof_Rect__height,_sizeof_OpenWindow,_offsetof_OpenWindow__id,_offsetof_OpenWindow__type,_offsetof_OpenWindow__show,_sizeof_WindowList,_offsetof_WindowList__length,_offsetof_WindowList__list,_sizeof_NewWindowSignature,_offsetof_NewWindowSignature__param,_offsetof_NewWindowSignature__result', '-sEXIT_RUNTIME=1', '--embed-file', 'static/', '--embed-file', 'xterm-256color.terminfo@/usr/share/terminfo/x/xterm-256color'], dependencies: [lua_dep])

  executable('runtime-node', sources, name_suffix: 'mjs', c_args: ['-std=gnu2x', '-Os', '-Wall', '-Wextra', '-pthread', '-Ivendor/libedit/src/'], link_args: ['-lproxyfs.js', 'libedit.a', 'libncurses.a', 'libfilesystem.a', 'libdeapi.a', '-Wl,--whole-archive', 'libprocesses.a', '-pthread', '--post-js=post.js', '--pre-js=pre.js', '-sSHARED_MEMORY=1', '-sPROXY_TO_PTHREAD', '-sEXPORT_ES6', '-sENVIRONMENT=node', '-sEXPORTED_RUNTIME_METHODS=stringToUTF8,UTF8ToString,stringToNewUTF8,setValue,wasmMemory', '-EXPORTED_FUNCTIONS=_malloc,_sizeof_Rect,_offsetof_Rect__width,_offsetof_Rect__height,_sizeof_OpenWindow,_offsetof_OpenWindow__id,_offsetof_OpenWindow__type,_offsetof_OpenWindow__show,_sizeof_WindowList,_offsetof_WindowList__length,_offsetof_WindowList__list,_sizeof_NewWindowSignature,_offsetof_NewWindowSignature__param,_offsetof_NewWindowSignature__result', '-sEXIT_RUNTIME=1', '--embed-file', 'static/', '--embed-file', 'xterm-256color.terminfo@/usr/local/share/terminfo/x/xterm-256color', '-sASSERTIONS=2'], dependencies: [lua_dep])
else
  sources = files('src/file.c', 'src/errors.c', 'src/process.c', 'src/shared.c', 'src/terminal.c')
  libruntime = library('runtime', sources, c_args: ['-std=gnu2x', '-Os', '-Wall', '-Wextra', '-D_FILE_OFFSET_BITS=64'], dependencies: [lua_dep.as_link_whole()], install: true)

  # Create test program
  unity_dep = dependency('unity', static: true)
  test_file_api = executable('test-runtime', 'test/file-api.c', c_args: ['-std=gnu2x', '-Os', '-Wall', '-Wextra', '-D_FILE_OFFSET_BITS=64'], link_args: ['-lm', 'libfilesystem.a'], link_with: [libruntime], dependencies: [unity_dep, lua_dep])
  test('Test lua file API', test_file_api)
endif
