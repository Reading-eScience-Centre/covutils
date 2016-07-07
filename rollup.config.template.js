import babel from 'rollup-plugin-babel'
import nodeResolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import uglify from 'rollup-plugin-uglify'
import json from 'rollup-plugin-json'

export default options => {
  let lite = options.lite ? '-lite' : ''
  return {
    entry: 'src/index' + lite + '.js',
    plugins: [
      babel({ babelrc: false, presets: ['es2015-rollup'], exclude: 'node_modules/**' }),
      nodeResolve({ jsnext: true, browser: true }),
      commonjs({ include: 'node_modules/**' }),
      // needed for proj4 (dependency of uriproj), not sure why
      // see https://github.com/rollup/rollup-plugin-commonjs/issues/28
      json()
    ].concat(options.minify ? [uglify()] : []),
    external: false, // bundle all dependencies

    dest: 'covutils' + lite + '.' + (options.minify ? 'min' : 'src') + '.js',
    format: 'iife',
    moduleName: 'CovUtils',
    sourceMap: true
  }
}
