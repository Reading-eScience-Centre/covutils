// IE11 support
import 'core-js/es6/symbol'

import assert from 'assert'
import * as CovJSON from 'covjson-reader'

import {withParameters, withCategories, maskByPolygon} from '../src'

describe("util/transform methods", () => {
  describe("#withParameters", () => {
    it('shall not modify the original coverage', () => {
      let cov = {
          parameters: new Map([['LC', 
            {
              name: 'foo'
            }]])
      }
      let newparams = new Map([['LC', 
         {
           name: 'bar'
         }]])
      
      let newcov = withParameters(cov, newparams)
      
      assert.equal(cov.parameters.get('LC').name, 'foo')
      assert.equal(newcov.parameters.get('LC').name, 'bar') 
    })   
  })
  
  describe("#withCategories", () => {
    it('shall not modify the original coverage', () => {
      let foo = 'foo'
      let bar = 'bar'
      let cov = {
          type: 'Coverage',
          parameters: new Map([['LC', 
            {
              observedProperty: {
                categories: [{
                  id: foo
                }, {
                  id: bar
                }] 
              },
              categoryEncoding: new Map([
                [foo, [1,2]],
                [bar, [3]]
                ])
            }]])
      }
      let foobar = 'foobar'
      let newobsprop = {
        categories: [{
          id: foobar
        }]
      }
      
      let mapping = new Map([
        [foo, foobar],
        [bar, foobar]
      ])
      
      let newcov = withCategories(cov, 'LC', newobsprop, mapping)
      
      assert.strictEqual(cov.parameters.get('LC').observedProperty.categories[0].id, foo)
      assert.strictEqual(cov.parameters.get('LC').observedProperty.categories[1].id, bar)
      assert.deepEqual(cov.parameters.get('LC').categoryEncoding.get(foo), [1,2])
      assert.deepEqual(cov.parameters.get('LC').categoryEncoding.get(bar), [3])
      assert.strictEqual(newcov.parameters.get('LC').observedProperty.categories[0].id, foobar)
      assert.deepEqual(newcov.parameters.get('LC').categoryEncoding.get(foobar), [1,2,3])
    })
  })
  
  describe("#maskedByPolygon", () => {
    let covjson = {
      "type" : "Coverage",
      "domain" : {
        "type" : "Domain",
        "domainType": "Grid",
        "axes": {
          "x" : { "values": [-10,5] },
          "y" : { "values": [40] }
        },
        "referencing": []
      },
      "parameters" : {
        "ICEC": {
          "type" : "Parameter",
          "unit" : { "symbol" : "fraction" },
          "observedProperty" : {
            "label" : { "en": "Sea Ice Concentration" }
          }
        }
      },
      "ranges" : {
        "ICEC" : {
          "type" : "NdArray",
          "axisNames": ["y", "x"],
          "shape": [1, 2],
          "values" : [ 0.5, 0.6 ]
        }
      }
    }
    // contains [-10,40] coordinate, but not [5,40]
    let polygon = {
      "type": "Polygon",
      "coordinates": [
        [ [-15, 50], [-10, 30], [0, 50], [-15, 50] ]
      ]
    }
    
    it('shall not modify the original coverage', () => {
      return CovJSON.read(JSON.parse(JSON.stringify(covjson))).then(cov => {
        return maskByPolygon(cov, polygon).then(newcov => {
          return cov.loadRange('ICEC').then(range => {
            assert.strictEqual(range.get({x: 0}), 0.5)
            assert.strictEqual(range.get({x: 1}), 0.6)
          })
        })
      })
    })
    
    it('shall mask the correct range values', () => {
      return CovJSON.read(JSON.parse(JSON.stringify(covjson))).then(cov => {
        return maskByPolygon(cov, polygon).then(newcov => {
          return newcov.loadRange('ICEC').then(range => {
            assert.strictEqual(range.get({x: 0}), 0.5)
            assert.strictEqual(range.get({x: 1}), null)
          })
        })
      })
    })
  })
})
