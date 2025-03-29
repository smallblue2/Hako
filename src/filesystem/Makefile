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
  	-s EXPORTED_FUNCTIONS=_file__pullFromPersist,_file__pushToPersist,_file__initialiseFS,_file__open,_file__close,_file__read,_file__write,_file__read_all,_file__shift,_file__goto,_file__remove,_file__move,_file__make_dir,_file__remove_dir,_file__read_dir,_file__stat,_file__fdstat,_file__change_dir,_file__permit,_file__truncate,_malloc,_free \
  	-s EXPORTED_RUNTIME_METHODS=ccall,cwrap,getValue,setValue,stackAlloc,stackSave,stackRestore,UTF8ToString,FS,SYSCALLS
	cp $(BUILD_DIR)/compiled.* $(OUTPUT_DIR)/.

lint:
	emcc -c -o out/main.o src/main.c -sSTRICT
	clang-tidy src/main.c -- -I$(EMSDK)/upstream/emscripten/cache/sysroot/include
	cppcheck src/main.c --force --enable=all --suppress=unmatchedSuppression --suppress=unusedFunction -I$(EMSDK)/upstream/emscripten/cache/sysroot/include


clean:
	rm $(BUILD_DIR)/*.wasm $(BUILD_DIR)/*.mjs
	rm $(OUTPUT_DIR)/*.wasm $(OUTPUT_DIR)/*.mjs
