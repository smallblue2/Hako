project('filesystem', 'c',
  version : '0.1',
  default_options : ['warning_level=3', 'default_library=static'])

if host_machine.system() == 'emscripten'
  add_global_arguments('-pthread', language: 'c')
endif

configure_file(input: 'index.html', output: 'index.html', copy: true)
configure_file(input: 'index.js', output: 'index.js', copy: true)

configure_file(input: 'api/api.js', output: 'api.js', copy: true)
configure_file(input: 'api/definitions.js', output: 'definitions.js', copy: true)

sources = files('src/main.c')

if host_machine.system() == 'emscripten'
  executable('filesystem', sources, c_args: ['-std=gnu2x', '-Os', '-Wall', '-Wextra', '-pthread'], link_args: ['-lidbfs.js', '-sFORCE_FILESYSTEM', '-sEXPORTED_FUNCTIONS=_file__pushToPersist,_file__pullFromPersist,_file__initialiseFS,_file__open,_file__close,_file__read,_file__write,_file__read_all,_file__shift,_file__goto,_file__remove,_file__move,_file__make_dir,_file__remove_dir,_file__read_dir,_file__stat,_file__fdstat,_file__change_dir,_file__permit,_malloc,_free', '-sEXPORTED_RUNTIME_METHODS=ccall,cwrap,getValue,setValue,stackAlloc,stackSave,stackRestore,UTF8ToString,FS,SYSCALLS,IDBFS', '-pthread', '-sEXPORT_ES6'])

  library('filesystem', sources, c_args: ['-std=gnu2x', '-Os', '-Wall', '-Wextra', '-pthread'], link_args: ['-lidbfs.js', '-sFORCE_FILESYSTEM', '-pthread', '-sEXPORT_ES6', '-sPROXY_TO_PTHREAD', '-sENVIRONMENT=web,worker'], install: true)
else
  library('filesystem', sources, c_args: ['-std=gnu2x', '-Os', '-Wall', '-Wextra', '-D_FILE_OFFSET_BITS=64'], install: true)
endif
