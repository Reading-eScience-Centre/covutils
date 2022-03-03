import { defineConfig } from 'rollup';
import babel from '@rollup/plugin-babel'
import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import { terser } from 'rollup-plugin-terser'

const inputCfgs = [
  {
    lite: true,
  },
  {
    lite: false,
  }
]

const outputCfgs = [
  {
    minify: true,
  },
  {
    minify: false
  }
]

export default inputCfgs.map(inputOpts => defineConfig({
  input: 'src/index' + (inputOpts.lite ? '-lite' : '') + '.js',
  plugins: [
    nodeResolve({ browser: true }),
    commonjs({ include: 'node_modules/**' }),
    babel({ babelHelpers: 'bundled' }),
  ],
  external: false, // bundle all dependencies

  output: outputCfgs.map(opts => ({
    file: 'covutils' + (inputOpts.lite ? '-lite' : '') + '.' + (opts.minify ? 'min' : 'src') + '.js',
    format: 'iife',
    name: 'CovUtils',
    sourcemap: true,
    plugins: (opts.minify ? [terser()] : [])
  })),
}))
