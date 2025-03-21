project('runtime', 'c',
  version : '0.1',
  default_options : ['warning_level=3', 'default_library=static'])

if host_machine.system() == 'emscripten'
  configure_file(input: 'js/emscripten-pty.js', output: 'emscripten-pty.js', copy: true)
  configure_file(input: 'js/pre.js', output: 'pre.js', copy: true)
  configure_file(input: 'js/post.js', output: 'post.js', copy: true)
endif

if host_machine.system() == 'emscripten'
  configure_file(input: '../../build/filesystem/libfilesystem.a', output: 'libfilesystem.a', copy: true)
  configure_file(input: '../../build/processes/libprocesses.a', output: 'libprocesses.a', copy: true)
  configure_file(input: '../../build/processes/signal.js', output: 'signal.js', copy: true)
  configure_file(input: '../../build/processes/common.js', output: 'common.js', copy: true)
  configure_file(input: '../../build/processes/pipe.js', output: 'pipe.js', copy: true)
  configure_file(input: '../../build/processes/processTable.js', output: 'processTable.js', copy: true)
  configure_file(input: '../../build/processes/processManager.js', output: 'processManager.js', copy: true)
  configure_file(input: '../../build/processes/process.js', output: 'process.js', copy: true)
  configure_file(input: '../../build/filesystem/api.js', output: 'api.js', copy: true)
  configure_file(input: '../../build/filesystem/definitions.js', output: 'definitions.js', copy: true)
  configure_file(input: '../../build/filesystem/filesystem.js', output: 'filesystem.js', copy: true)
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
  sources = files('src/main.c', 'src/file.c', 'src/errors.c', 'src/process.c', 'src/shared.c', 'src/terminal.c')
  executable('runtime', sources, c_args: ['-std=gnu2x', '-Os', '-Wall', '-Wextra', '-pthread'], link_args: ['-lproxyfs.js', 'libfilesystem.a', '-Wl,--whole-archive', 'libprocesses.a', '-pthread', '--post-js=post.js', '--pre-js=pre.js', '--js-library=emscripten-pty.js', '-sSHARED_MEMORY=1', '-sPROXY_TO_PTHREAD', '-sEXPORT_ES6', '-sENVIRONMENT=web,worker', '-sEXPORTED_RUNTIME_METHODS=stringToUTF8,UTF8ToString,stringToNewUTF8,setValue,wasmMemory', '-sEXIT_RUNTIME=1', '--embed-file', 'static/'], dependencies: [lua_dep])

  executable('runtime-node', sources, c_args: ['-std=gnu2x', '-O0', '-Wall', '-Wextra', '-pthread'], link_args: ['-lproxyfs.js', 'libfilesystem.a', '-Wl,--whole-archive', 'libprocesses.a', '-pthread', '--post-js=post.js', '--pre-js=pre.js', '-sSHARED_MEMORY=1', '-sPROXY_TO_PTHREAD', '-sEXPORT_ES6', '-sENVIRONMENT=node', '-sEXPORTED_RUNTIME_METHODS=stringToUTF8,UTF8ToString,stringToNewUTF8,setValue,wasmMemory', '-sEXIT_RUNTIME=1', '--embed-file', 'static/', '-sASSERTIONS=2'], dependencies: [lua_dep])
else
  sources = files('src/file.c', 'src/errors.c', 'src/process.c', 'src/shared.c', 'src/terminal.c')
  libruntime = library('runtime', sources, c_args: ['-std=gnu2x', '-Os', '-Wall', '-Wextra', '-D_FILE_OFFSET_BITS=64'], dependencies: [lua_dep.as_link_whole()], install: true)

  # Create test program
  unity_dep = dependency('unity', static: true)
  test_file_api = executable('test-runtime', 'test/file-api.c', c_args: ['-std=gnu2x', '-Os', '-Wall', '-Wextra', '-D_FILE_OFFSET_BITS=64'], link_args: ['-lm', 'libfilesystem.a'], link_with: [libruntime], dependencies: [unity_dep, lua_dep])
  test('Test lua file API', test_file_api)
endif
