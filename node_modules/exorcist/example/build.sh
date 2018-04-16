#!/usr/bin/env sh

rm -f bundle.*

../node_modules/.bin/browserify main.js -d | node ../bin/exorcist.js bundle.js.map > bundle.js 
