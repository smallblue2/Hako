project('runtime', 'c',
  version : '0.1',
  default_options : ['warning_level=3', 'default_library=static'])

fs = import('fs')

if host_machine.system() == 'emscripten'
  fs.copyfile('js/emscripten-pty.js', 'emscripten-pty.js')
  fs.copyfile('js/pre.js', 'pre.js')
  fs.copyfile('js/post.js', 'post.js')
endif

if host_machine.system() == 'emscripten'
  fs.copyfile('../../build/filesystem/libfilesystem.a', 'libfilesystem.a')
else
  fs.copyfile('../../build-native/filesystem/libfilesystem.a', 'libfilesystem.a')
endif

if host_machine.system() == 'emscripten'
  add_global_arguments('-pthread', language: 'c')
endif

lua_dep = dependency('lua', static: true, default_options: ['line_editing=disabled'])

if host_machine.system() == 'emscripten'
  sources = files('src/main.c', 'src/file.c', 'src/errors.c')
  executable('runtime', sources, c_args: ['-std=gnu23', '-Os', '-Wall', '-Wextra', '-pthread'], link_args: ['-lidbfs.js', 'libfilesystem.a', '-pthread', '--post-js=post.js', '--pre-js=pre.js', '--js-library=emscripten-pty.js', '-sPROXY_TO_PTHREAD', '-sEXPORT_ES6', '-sENVIRONMENT=web,worker'], dependencies: [lua_dep])
else
  sources = files('src/file.c', 'src/errors.c')
  libruntime = library('runtime', sources, c_args: ['-std=gnu23', '-Os', '-Wall', '-Wextra', '-D_FILE_OFFSET_BITS=64'], dependencies: [lua_dep.as_link_whole()], install: true)

  # Create test program
  unity_dep = dependency('unity', static: true)
  test_file_api = executable('test-runtime', 'test/file-api.c', c_args: ['-std=gnu23', '-Os', '-Wall', '-Wextra', '-D_FILE_OFFSET_BITS=64'], link_args: ['-lm', 'libfilesystem.a'], link_with: [libruntime], dependencies: [unity_dep])
  test('Test lua file API', test_file_api)
endif
