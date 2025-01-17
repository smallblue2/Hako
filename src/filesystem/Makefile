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
  	-s EXPORTED_FUNCTIONS=_syncFS,_initialiseFS,_fs_close,_fs_write,_fs_read,_fs_lseek,_fs_access,_fs_stat,_malloc,_free,_fs_lstat,_fs_chmod,_fs_utime,_fs_ftruncate,_fs_chown \
  	-s EXPORTED_RUNTIME_METHODS=ccall,cwrap,getValue,setValue,stackAlloc,stackSave,stackRestore,UTF8ToString,FS
	cp $(BUILD_DIR)/compiled.* $(OUTPUT_DIR)/.

lint:
	emcc -c -o out/main.o src/main.c -sSTRICT
	clang-tidy src/main.c -- -I$(EMSDK)/upstream/emscripten/cache/sysroot/include
	cppcheck src/main.c --enable=all --suppress=unmatchedSuppression --suppress=unusedFunction -I$(EMSDK)/upstream/emscripten/cache/sysroot/include


clean:
	rm $(BUILD_DIR)/*.wasm $(BUILD_DIR)/*.mjs
	rm $(OUTPUT_DIR)/*.wasm $(OUTPUT_DIR)/*.mjs
