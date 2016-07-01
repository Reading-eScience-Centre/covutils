import assert from 'assert'

import xndarray from 'xndarray'

import {fromDomain, fromXndarray} from '../../src'
import {withSimpleDerivedParameter, maskByPolygon} from '../../src'

describe("coverage/transform", () => {
  describe("#withSimpleDerivedParameter", () => {
    it("should have correct range values", () => {
      let domain = {
        type: 'Domain',
        axes: new Map([
          ['x', {
            key: 'x',
            values: [0,1,2]
          }],
          ['y', {
            key: 'y',
            values: [3,4]
          }]
        ])
      }
      let cov = fromDomain(domain)
      let paramKey = cov.parameters.keys().next().value
      
      let fn = val => val + 5
      
      let derivedKey = 'foo'
      let derived = withSimpleDerivedParameter(cov, {
        parameter: {
          key: derivedKey,
          observedProperty: {
            label: {en: 'bar'}
          }
        },
        inputParameters: [paramKey],
        fn
      })
      
      assert(derived.parameters.has(derivedKey))
      
      return derived.loadRanges([paramKey, derivedKey]).then(ranges => {
        let range1 = ranges.get(paramKey)
        let range2 = ranges.get(derivedKey)
        assert.strictEqual(range2.get({x:0, y:0}), fn(range1.get({x: 0, y: 0})))
      })
    })
  })
    
  describe('#maskByPolygon', () => {
    it("should mask correctly", () => {
      var grid = xndarray(
        [17.3, 18.2, 16.5, 18.7,
         18.1, 19.4, 17.2, 18.6,
         19.2, 20.4, 21.1, 20.7,
         21.1, 21.3, 20.5, 19.2], {
        shape: [4,4],
        names: ['y','x'],
        coords: {
          y: [54, 52, 50, 48],
          x: [0, 10, 20, 30]
        }
      })
      let cov = fromXndarray(grid)
      let paramKey = cov.parameters.keys().next().value
      
      let polygon = {
        type: 'MultiPolygon',
        coordinates: [
          [[[-1,55],[21,55],[21,51],[-1,51],[-1,55]]],
          [[[15,51],[35,51],[35,47],[15,47],[15,51]]]
        ]
      }
      let mask = [
        [1,1,1,0],
        [1,1,1,0],
        [0,0,1,1],
        [0,0,1,1]
      ]
      
      return maskByPolygon(cov, polygon).then(masked => {
        return masked.loadRange(paramKey).then(range => {
          for (let y=0; y < 4; y++) {
            for (let x=0; x < 4; x++) {
              assert.equal(range.get({x,y}) !== null, mask[y][x], `y: ${y}, x: ${x}, v: ${range.get({x,y})}`)
            }
          }
        })
      })
    })
  })
})