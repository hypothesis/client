# mold-source-map [![build status](https://secure.travis-ci.org/thlorenz/mold-source-map.png)](http://travis-ci.org/thlorenz/mold-source-map)

Mold a source map that is almost perfect for you into one that is.

```js
browserify()
  .require(require.resolve('./project/js/main.js'), { entry: true })
  .bundle({ debug: true })

  // will show all source files relative to jsRoot inside devtools
  .pipe(mold.transformSourcesRelativeTo(jsRoot))
  .pipe(fs.createWriteStream(bundlePath));
```
Full example [here](https://github.com/thlorenz/mold-source-map/blob/master/examples/browserify-sources.js).

## Installation

    npm install mold-source-map

## API

### Transforms

Transforms return a duplex stream and are therefore easily threaded into a bundler that streams the generated bundle,
like [browserify](https://github.com/substack/node-browserify).

#### transform(function map(sourcemap[, callback]) {})

This is the most generic and powerfull feature as it allows replacing the entire sourcemap comment with another `String`.

It takes a map function as input whose `sourcemap` argument has all information and lots of functions regarding the existing source map.

The optional `callback` can be used to call back with the final source map comment. If it is given, the transform will
invoke the function asynchronously, otherwise you may just return the final source map comment.

Here is a snippet from [an example](https://github.com/thlorenz/mold-source-map/blob/master/examples/browserify-external-map-file.js) 
showing how to use this in order to write out an external map file and point the browser to it:

```js
function mapFileUrlComment(sourcemap, cb) {
  
  // make source files appear under the following paths:
  // /js
  //    foo.js
  //    main.js
  // /js/wunder
  //    bar.js 
  
  sourcemap.sourceRoot('file://'); 
  sourcemap.mapSources(mold.mapPathRelativeTo(jsRoot));

  // write map file and return a sourceMappingUrl that points to it
  fs.writeFile(mapFilePath, sourcemap.toJSON(2), 'utf-8', function (err) {
    if (err) return console.error(err);
    cb('//@ sourceMappingURL=' + path.basename(mapFilePath));
  });
}

browserify()
  .require(require.resolve('./project/js/main.js'), { entry: true })
  .bundle({ debug: true })
  .pipe(mold.transform(mapFileUrlComment))
  .pipe(fs.createWriteStream(bundlePath));
```

[This example](https://github.com/thlorenz/mold-source-map/blob/master/examples/browserify-external-map-file-sync.js) achieves the same using sync operations.

### Convenience Transforms

The below transforms addressing special use cases. These cases all could be implemented with the generic transform as well.

### transformSourcesRelativeTo(root : String)

```
/**
 * Adjusts all sources paths inside the source map contained in the content that is piped to it.
 *
 * Example: bundleStream.pipe(mold.sourcesRelative(root)).pipe(fs.createWriteStream(bundlePath))
 *
 * @name sourcesRelative
 * @function
 * @param root {String} The path to make sources relative to.
 * @return {Stream} A duplex stream that writes out content with source map that had all sources paths adjusted.
 */
 ```

## Unstable API

A more custom/advanced API will be/is exposed, however it is still in high fluctuation.

Take a look at the `index.js` to get an idea of what's coming/already there.
