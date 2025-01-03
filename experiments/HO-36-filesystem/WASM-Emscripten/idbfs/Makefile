.PHONY: build, clean, run

run:
	emcc -lidbfs.js main.c -o main.js -s -sFORCE_FILESYSTEM -sEXPORTED_FUNCTIONS=_printNodeStat,_readFile,_writeFile,_syncFS,_initialiseFS -sEXPORTED_RUNTIME_METHODS=ccall,cwrap,stringToNewUTF8
	python -m http.server 8080

build:
	emcc -lidbfs.js main.c -o main.js -s -sFORCE_FILESYSTEM -sEXPORTED_FUNCTIONS=_printNodeStat,_readFile,_writeFile,_syncFS,_initialiseFS -sEXPORTED_RUNTIME_METHODS=ccall,cwrap,stringToNewUTF8

clean:
	rm *.wasm *.js
