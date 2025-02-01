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
  	-s EXPORTED_FUNCTIONS=_file__syncFS,_file__initialiseFS,_file__open,_file__close,_file__read,_file__write,_free \
  	-s EXPORTED_RUNTIME_METHODS=ccall,cwrap,getValue,setValue,stackAlloc,stackSave,stackRestore,UTF8ToString,FS
	cp $(BUILD_DIR)/compiled.* $(OUTPUT_DIR)/.

lint:
	emcc -c -o out/main.o src/main.c -sSTRICT
	clang-tidy src/main.c -- -I$(EMSDK)/upstream/emscripten/cache/sysroot/include
	cppcheck src/main.c --force --enable=all --suppress=unmatchedSuppression --suppress=unusedFunction -I$(EMSDK)/upstream/emscripten/cache/sysroot/include


clean:
	rm $(BUILD_DIR)/*.wasm $(BUILD_DIR)/*.mjs
	rm $(OUTPUT_DIR)/*.wasm $(OUTPUT_DIR)/*.mjs
