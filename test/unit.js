import assert from 'assert'

import {toAscii} from '../lib/unit.js'

describe("unit", () => {  
  describe('#toAscii', () => {
    it("should work correctly", () => {
      let unit1 = {
        symbol: '°C'
      }
      assert.strictEqual(toAscii(unit1), unit1.symbol)
      
      let unit2 = {
        label: {
          en: 'Degree Celsius',
          de: 'Grad Celsius'
        }
      }
      assert.strictEqual(toAscii(unit2, 'en'), unit2.label.en)
      assert.strictEqual(toAscii(unit2, 'de'), unit2.label.de)
      
      let unit3 = {
        symbol: {
          value: 'Cel',
          type: 'http://www.opengis.net/def/uom/UCUM/'
        },
        label: {
          en: 'Degree Celsius'
        }
      }
      assert.strictEqual(toAscii(unit3), '°C')
    })
  })
})