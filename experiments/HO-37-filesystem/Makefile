.PHONY: run, build, clean

run:
	npx http-server . -p 8080

build:
	# emcc -lidbfs.js src/main.c -o out/compiled.js -s -sFORCE_FILESYSTEM -sEXPORTED_FUNCTIONS=_syncFS,_initialiseFS,_fs_open,_fs_close,_fs_write,_fs_read,_fs_lseek,_free_read_ptr -sEXPORTED_RUNTIME_METHODS=ccall,cwrap,stringToNewUTF8,Uint8Array
	emcc \
  	-lidbfs.js \
  	src/main.c \
  	-o out/compiled.js \
  	-s FORCE_FILESYSTEM \
  	-s EXPORTED_FUNCTIONS=_syncFS,_initialiseFS,_fs_open,_fs_close,_fs_write,_fs_read,_fs_lseek,_free_read_ptr,_fs_unlink,_fs_rename,_fs_access \
  	-s EXPORTED_RUNTIME_METHODS=ccall,cwrap,getValue,setValue,stackAlloc,stackSave,stackRestore,UTF8ToString

clean:
	rm out/*.wasm out/*.js
