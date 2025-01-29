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

executable('main', 'src/main.c', c_args: ['-std=gnu99', '-Os', '-Wall', '-Wextra', '-pthread'], link_args: ['-pthread', '--pre-js=pre.js', '--js-library=emscripten-pty.js', '-sPROXY_TO_PTHREAD', '-sASSERTIONS=2', '-sEXPORT_ES6', '-sENVIRONMENT=web,worker', '-sFORCE_FILESYSTEM'])
