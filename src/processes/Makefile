.PHONY: build, clean, lint, export

build:
	emcc c/main.c -o c/processes.js -s EXPORTED_FUNCTIONS=_test,_malloc -s ERROR_ON_UNDEFINED_SYMBOLS=0 -s EXPORTED_RUNTIME_METHODS=stringToUTF8,UTF8ToString,stringToNewUTF8,setValue -s MODULARIZE=1 -s EXPORT_ES6=1 -s ENVIRONMENT="web"
clean:
	rm c/runtime.js
	rm c/runtime.wasm

lint:
	clang-tidy c/main.c -- -I$(EMSDK)/upstream/emscripten/cache/sysroot/include
	cppcheck c/main.c --force --enable=all --suppress=unmatchedSuppression --suppress=unusedFunction -I$(EMSDK)/upstream/emscripten/cache/sysroot/include

export:
	mv c/processes.* src/.
