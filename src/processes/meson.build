project('process', 'c',
  version : '0.1',
  default_options : ['warning_level=3', 'default_library=static', 'werror=true'])

if host_machine.system() == 'emscripten'
  add_global_arguments('-pthread', language: 'c')
endif

configure_file(input: 'index.html', output: 'index.html', copy: true)
configure_file(input: 'index.js', output: 'index.js', copy: true)

configure_file(input: 'src/signal.mjs', output: 'signal.mjs', copy: true)
configure_file(input: 'src/common.mjs', output: 'common.mjs', copy: true)
configure_file(input: 'src/pipe.mjs', output: 'pipe.mjs', copy: true)
configure_file(input: 'src/processTable.mjs', output: 'processTable.mjs', copy: true)
configure_file(input: 'src/processManager.mjs', output: 'processManager.mjs', copy: true)
configure_file(input: 'src/process.mjs', output: 'process.mjs', copy: true)

sources = files('c/processes.c')

if host_machine.system() == 'emscripten'
  executable('processes', sources, name_suffix: 'mjs', c_args: ['-std=gnu2x', '-Os', '-Wall', '-Wextra'], link_args: ['-sEXPORTED_FUNCTIONS=_malloc', '-sEXPORTED_RUNTIME_METHODS=stringToUTF8,UTF8ToString,stringToNewUTF8,setValue,lengthBytesUTF8', '-pthread', '-sEXPORT_ES6', '-sENVIRONMENT=web,worker', '-sMODULARIZE=1'])

  library('processes', sources, c_args: ['-std=gnu2x', '-Os', '-Wall', '-Wextra'], link_args: ['-sEXPORTED_FUNCTIONS=_malloc', '-sEXPORTED_RUNTIME_METHODS=stringToUTF8,UTF8ToString,stringToNewUTF8,setValue', '-sEXPORT_ES6', '-sENVIRONMENT=web,worker'], install: true)
else
  library('processes', sources, c_args: ['-std=gnu2x', '-Os', '-Wall', '-Wextra', '-pthread'], install: true)
endif

