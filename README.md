# covutils

[![NPM version](http://img.shields.io/npm/v/covutils.svg)](https://npmjs.org/package/covutils) 
[![dependencies Status](https://david-dm.org/Reading-eScience-Centre/covutils/status.svg)](https://david-dm.org/Reading-eScience-Centre/covutils)
[![devDependencies Status](https://david-dm.org/Reading-eScience-Centre/covutils/dev-status.svg)](https://david-dm.org/reading-escience-centre/covutils?type=dev)
[![Build Status](https://travis-ci.org/Reading-eScience-Centre/covutils.svg?branch=master)](https://travis-ci.org/Reading-eScience-Centre/covutils)
[![Inline docs](http://inch-ci.org/github/Reading-eScience-Centre/covutils.svg?branch=master)](http://inch-ci.org/github/Reading-eScience-Centre/covutils)

JavaScript utilities for creating, transforming, and handling [Coverage Data objects](https://github.com/Reading-eScience-Centre/coverage-jsapi).

[API docs](https://doc.esdoc.org/github.com/Reading-eScience-Centre/covutils/)

## Usage

A minified bundle of this library is available on [unpkg](https://unpkg.com/covutils/).

Usage is simple:
```html
<script src="https://unpkg.com/covutils@0.6/covutils.min.js"></script>
<script>
var coverage = ... ;

// let's mask the Coverage with a GeoJSON polygon
// any data values outside the polygon become null
var polygon = {
  "type": "Polygon",
  "coordinates": [
    [ [100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0] ]
    ]
}
CovUtils.maskByPolygon(coverage, polygon, ['x','y'])
  .then(function (maskedCov) {
    // work with masked Coverage
  })
</script>
```

If polygon-related functionality is not needed, then a lite bundle can be used instead:
```html
<script src="https://unpkg.com/covutils@0.6/covutils-lite.min.js"></script>
```

### NPM

You may also use this library within common package managers as it is published on npm.

An ES2015 import may look like that:

```js
import {maskByPolygon} from 'covutils'
```

## Acknowledgments

This library has been developed within the [MELODIES project](http://www.melodiesproject.eu) and is maintained as open source software.
