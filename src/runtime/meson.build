project('example-hako-binary', 'c',
  version : '0.1',
  default_options : ['warning_level=3'])


configure_file(
  input: 'js/emscripten-pty.js',
  output: 'emscripten-pty.js',
  command: ['cp', '@INPUT@', '@OUTPUT@']
)

configure_file(
  input: 'js/pre.js',
  output: 'pre.js',
  command: ['cp', '@INPUT@', '@OUTPUT@']
)

configure_file(
  input: 'js/post.js',
  output: 'post.js',
  command: ['cp', '@INPUT@', '@OUTPUT@']
)

add_global_arguments('-pthread', language: 'c')

lua_dep = dependency('lua', static: true)

sources = files('src/main.c', 'src/fs.c')
executable('main', sources, c_args: ['-std=gnu99', '-Os', '-Wall', '-Wextra', '-pthread'], link_args: ['-lidbfs.js', '../main.a', '-pthread', '--post-js=post.js', '--pre-js=pre.js', '--js-library=emscripten-pty.js', '-sPROXY_TO_PTHREAD', '-sASSERTIONS=1', '-sEXPORT_ES6', '-sENVIRONMENT=web,worker'], dependencies: [lua_dep])
