.PHONY: build

build:
	emcc main.c -o main.mjs -s EXPORTED_FUNCTIONS='["_main"]' -s ERROR_ON_UNDEFINED_SYMBOLS=0 -s EXPORTED_RUNTIME_METHODS=stringToUTF8 -s MODULARIZE=1 -s EXPORT_ES6=1 -s ENVIRONMENT="web"

clean:
	rm main.mjs
	rm main.wasm
