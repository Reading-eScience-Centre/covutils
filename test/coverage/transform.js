import assert from 'assert'

import {fromDomain} from '../../lib/coverage/create.js'
import {withSimpleDerivedParameter} from '../../lib/coverage/transform.js'

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