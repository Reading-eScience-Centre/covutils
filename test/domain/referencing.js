// IE11 support
import 'core-js/es6/symbol'

import assert from 'assert'
import {assertAlmostEqual} from '../util.js'
import * as CovJSON from 'covjson-reader'

import {loadProjection, getHorizontalCRSComponents} from '../../src'

let covjsonGrid = () => ({
  "type" : "Coverage",
  "domain" : {
    "type" : "Domain",
    "domainType": "Point",
    "axes": {
      "x" : { "values": [429158] },
      "y" : { "values": [623009] }
    },
    "referencing": [{
      "components": ["x", "y"],
      "system": {
        "type": "ProjectedCRS",
        "id": "http://www.opengis.net/def/crs/EPSG/0/27700"
      }
    }]
  },
  "parameters" : {
    "temperature": {
      "type" : "Parameter",
      "unit" : { "symbol" : "K" },
      "observedProperty" : {
        "label" : { "en": "Air temperature" }
      }
    }
  },
  "ranges" : {
    "temperature" : {
      "type" : "NdArray",
      "values" : [2]
    }
  }
})

describe("domain/referencing functions", () => {
  describe("#loadProjection", () => {
    it('shall load the correct projection', () => {
      return CovJSON.read(covjsonGrid())
        .then(cov => cov.loadDomain())
        .then(domain => {
          return loadProjection(domain).then(proj => {
            let x = domain.axes.get('x').values[0]
            let y = domain.axes.get('y').values[0]
            let {lat,lon} = proj.unproject({x,y})
            assertAlmostEqual(lat, 55.5, 3)
            assertAlmostEqual(lon, -1.54, 3)
          })
        })
    })
  })
  describe("#getHorizontalCRSComponentX|Y", () => {
    it('shall return the correct components', () => {
      return CovJSON.read(covjsonGrid())
        .then(cov => cov.loadDomain())
        .then(domain => {
          let [x,y] = getHorizontalCRSComponents(domain)
          assert.strictEqual(x, 'x')
          assert.strictEqual(y, 'y')
        })
    })
  })
})
