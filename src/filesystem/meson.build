project('filesystem', 'c',
  version : '0.1',
  default_options : ['warning_level=3', 'default_library=static', 'werror=true'])

if host_machine.system() == 'emscripten'
  add_global_arguments('-pthread', language: 'c')
  add_global_arguments('-Wno-dollar-in-identifier-extension', language: 'c')
endif

configure_file(input: 'index.html', output: 'index.html', copy: true)
configure_file(input: 'index.js', output: 'index.js', copy: true)

configure_file(input: 'api/api.mjs', output: 'api.mjs', copy: true)
configure_file(input: 'api/definitions.mjs', output: 'definitions.mjs', copy: true)
configure_file(input: 'post.js', output: 'post.js', copy: true)

sources = files('src/main.c')

# Copy static directory - this is used for static asset files in emscripten
custom_target('copy_lua_source_dir',
  command: ['cp', '-r', meson.project_source_root() / 'luaSource', meson.project_build_root() / 'luaSource'],
  output: 'this_is_a_hack.txt',
  build_by_default: true
)

if host_machine.system() == 'emscripten'
  executable('filesystem', sources, name_suffix: 'mjs', c_args: ['-std=gnu2x', '-Os', '-Wall', '-Wextra', '-pthread'], link_args: ['-lidbfs.js', '-sFORCE_FILESYSTEM', '-sEXPORTED_FUNCTIONS=_file__pushToPersist,_file__pullFromPersist,_file__initialiseFSNode,_file__open,_file__close,_file__read,_file__write,_file__read_all,_file__shift,_file__goto,_file__remove,_file__move,_file__make_dir,_file__remove_dir,_file__read_dir,_file__stat,_file__fdstat,_file__change_dir,_file__permit,_file__truncate,_file__cwd,_malloc,_free,_sizeof_ReadResult,_offsetof_ReadResult__data,_offsetof_ReadResult__size,_sizeof_Time,_offsetof_Time__sec,_offsetof_Time__nsec,_sizeof_StatResult,_offsetof_StatResult__size,_offsetof_StatResult__blocks,_offsetof_StatResult__blocksize,_offsetof_StatResult__ino,_offsetof_StatResult__perm,_offsetof_StatResult__type,_offsetof_StatResult__atime,_offsetof_StatResult__mtime,_offsetof_StatResult__ctime', '-sEXPORTED_RUNTIME_METHODS=ccall,cwrap,getValue,setValue,stackAlloc,stackSave,stackRestore,UTF8ToString,FS,SYSCALLS,IDBFS', '--embed-file', 'luaSource', '-sEXPORT_ES6', '--post-js=post.js'])

  library('filesystem', sources, c_args: ['-std=gnu2x', '-Os', '-Wall', '-Wextra', '-pthread'], link_args: ['-lidbfs.js', '-sFORCE_FILESYSTEM', '-pthread', '-sEXPORT_ES6', '-sPROXY_TO_PTHREAD', '-sENVIRONMENT=web,worker'], install: true)
else
  library('filesystem', sources, c_args: ['-std=gnu2x', '-Os', '-Wall', '-Wextra', '-D_FILE_OFFSET_BITS=64'], install: true)
endif
