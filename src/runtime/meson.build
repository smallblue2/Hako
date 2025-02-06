project('runtime', 'c',
  version : '0.1',
  default_options : ['warning_level=3'])

fs = import('fs')

fs.copyfile('js/emscripten-pty.js', 'emscripten-pty.js')
fs.copyfile('js/pre.js', 'pre.js')
fs.copyfile('js/post.js', 'post.js')
fs.copyfile('../../build/filesystem/libfilesystem.a', 'libfilesystem.a')

add_global_arguments('-pthread', language: 'c')

lua_dep = dependency('lua', static: true)

sources = files('src/main.c', 'src/fs.c')
executable('runtime', sources, c_args: ['-std=gnu99', '-Os', '-Wall', '-Wextra', '-pthread'], link_args: ['-lidbfs.js', 'libfilesystem.a', '-pthread', '--post-js=post.js', '--pre-js=pre.js', '--js-library=emscripten-pty.js', '-sPROXY_TO_PTHREAD', '-sASSERTIONS=1', '-sEXPORT_ES6', '-sENVIRONMENT=web,worker'], dependencies: [lua_dep])
