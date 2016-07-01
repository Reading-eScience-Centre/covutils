import assert from 'assert'

import {stringifyUnit} from '../src'

describe("unit", () => {  
  describe('#toAscii', () => {
    it("should work correctly", () => {
      let unit1 = {
        symbol: '°C'
      }
      assert.strictEqual(stringifyUnit(unit1), unit1.symbol)
      
      let unit2 = {
        label: {
          en: 'Degree Celsius',
          de: 'Grad Celsius'
        }
      }
      assert.strictEqual(stringifyUnit(unit2, 'en'), unit2.label.en)
      assert.strictEqual(stringifyUnit(unit2, 'de'), unit2.label.de)
      
      let unit3 = {
        symbol: {
          value: 'Cel',
          type: 'http://www.opengis.net/def/uom/UCUM/'
        },
        label: {
          en: 'Degree Celsius'
        }
      }
      assert.strictEqual(stringifyUnit(unit3), '°C')
    })
  })
})