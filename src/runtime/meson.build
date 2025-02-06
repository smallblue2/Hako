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

sources = files('src/main.c', 'src/file.c', 'src/errors.c')

executable('runtime', sources, c_args: ['-std=gnu23', '-Os', '-Wall', '-Wextra', '-pthread'], link_args: ['-lidbfs.js', 'libfilesystem.a', '-pthread', '--post-js=post.js', '--pre-js=pre.js', '--js-library=emscripten-pty.js', '-sPROXY_TO_PTHREAD', '-sEXPORT_ES6', '-sENVIRONMENT=web,worker', '-sFORCE_FILESYSTEM', '-sEXPORTED_FUNCTIONS=_main,_file__syncFS,_file__initialiseFS,_file__open,_file__close,_file__read,_file__write,_file__read_all,_file__shift,_file__goto,_file__remove,_file__move,_file__make_dir,_file__remove_dir,_file__read_dir,_file__stat,_file__fdstat,_file__change_dir,_file__permit,_malloc,_free', '-sEXPORTED_RUNTIME_METHODS=ccall,cwrap,getValue,setValue,stackAlloc,stackSave,stackRestore,UTF8ToString,FS,SYSCALLS'], dependencies: [lua_dep])
