.PHONY: build, clean, export

build:
	emcc main.c -o runtime.js -s EXPORTED_FUNCTIONS=_test,_malloc -s ERROR_ON_UNDEFINED_SYMBOLS=0 -s EXPORTED_RUNTIME_METHODS=stringToUTF8,UTF8ToString,stringToNewUTF8,setValue -s MODULARIZE=1 -s EXPORT_ES6=1 -s ENVIRONMENT="web" -s WASM_BIGINT=1

clean:
	rm runtime.js
	rm runtime.wasm

export:
	mv ./runtime.* ../src/.
