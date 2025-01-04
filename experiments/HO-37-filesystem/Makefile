.PHONY: run, build, test, clean

run:
	npx http-server . -p 8080

build:
	emcc -lidbfs.js src/main.c -o out/compiled.js -s -sFORCE_FILESYSTEM -sEXPORTED_FUNCTIONS=_syncFS,_initialiseFS,_fs_open,_fs_close,_fs_write,_fs_read,_fs_lseek -sEXPORTED_RUNTIME_METHODS=ccall,cwrap,stringToNewUTF8,Uint8Array

test:
	npx cypress open

clean:
	rm out/*.wasm out/*.js
