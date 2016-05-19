import assert from 'assert'

import xndarray from 'xndarray'

import {fromXndarray} from '../../lib/coverage/create.js'

describe("coverage/create", () => {  
  describe('#fromXndarray', () => {
    it("should work correctly", () => {
      let X = 'x'
      let Y = 'y'
      let y = [54, 52]
      let x = [0, 10]
      var grid = xndarray(
        [1,2,
         3,4], {
        shape: [2,2],
        names: [Y,X],
        coords: {
          y, x
        }
      })
      let cov = fromXndarray(grid)
      
      assert.strictEqual(cov.parameters.size, 1)
      let paramKey = cov.parameters.keys().next().value
      
      return cov.loadDomain().then(domain => {
        assert(domain.axes.has(X))
        assert(domain.axes.has(Y))
        assert.deepEqual(domain.axes.get(X).values, x)
        assert.deepEqual(domain.axes.get(Y).values, y)
        
        return cov.loadRange(paramKey).then(range => {
          for (let i=0; i < 2; i++) {
            for (let j=0; j < 2; j++) {
              assert.strictEqual(range.get({x: i, y: j}), grid.xget({x: i, y: j}))
            }
          }
        })
      })
    })
  })
})