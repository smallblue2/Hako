.PHONY: run, build, clean

BUILD_DIR = out
OUTPUT_DIR = api

run:
	npx http-server . -p 8080

build:
	emcc \
  	-lidbfs.js \
  	src/main.c \
  	-o $(BUILD_DIR)/compiled.mjs \
  	-s FORCE_FILESYSTEM \
  	-s EXPORTED_FUNCTIONS=_syncFS,_initialiseFS,_fs_open,_fs_close,_fs_write,_fs_read,_fs_lseek,_fs_unlink,_fs_rename,_fs_access,_printNodeStat,_fs_stat,_malloc,_free,_fs_lstat,_fs_symlink,_fs_link,_fs_mkdir,_fs_readdir,_fs_opendir,_fs_closedir,_fs_rmdir,_fs_chdir,_fs_chmod,_fs_utime,_fs_cp,_fs_ftruncate \
  	-s EXPORTED_RUNTIME_METHODS=ccall,cwrap,getValue,setValue,stackAlloc,stackSave,stackRestore,UTF8ToString
	cp $(BUILD_DIR)/compiled.* $(OUTPUT_DIR)/.

lint:
	emcc -c -o out/main.o src/main.c -sSTRICT
	clang-tidy src/main.c -- -I$(EMSDK)/upstream/emscripten/cache/sysroot/include
	cppcheck src/main.c --enable=all --suppress=unmatchedSuppression --suppress=unusedFunction -I$(EMSDK)/upstream/emscripten/cache/sysroot/include


clean:
	rm $(BUILD_DIR)/*.wasm $(BUILD_DIR)/*.mjs
	rm $(OUTPUT_DIR)/*.wasm $(OUTPUT_DIR)/*.mjs
