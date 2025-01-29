#!/bin/sh

emmake make -C lua-5.4.7/src/
cp ./lua-5.4.7/src/lua.mjs ../static/
cp ./lua-5.4.7/src/lua.wasm ../static/
cp ./lua-5.4.7/src/lua.worker.js ../static/
