import babel from 'rollup-plugin-babel'
import nodeResolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import uglify from 'rollup-plugin-uglify'

export default options => {
  let lite = options.lite ? '-lite' : ''
  return {
    entry: 'src/index' + lite + '.js',
    plugins: [
      babel({ babelrc: false, presets: ['es2015-rollup'], exclude: 'node_modules/**' }),
      nodeResolve({ jsnext: true, browser: true }),
      commonjs({ include: 'node_modules/**' })
    ].concat(options.minify ? [uglify()] : []),
    external: false, // bundle all dependencies

    dest: 'covutils' + lite + '.' + (options.minify ? 'min' : 'src') + '.js',
    format: 'iife',
    moduleName: 'CovUtils',
    sourceMap: true
  }
}
