import { getLanguageString } from './i18n.js'

/**
 * Converts a unit object to a human-readable symbol or label, where symbols are preferred.
 *
 * @example
 * var unit = {
 *   symbol: '°C'
 * }
 * var str = CovUtils.stringifyUnit(unit) // str == '°C'
 *
 * @example
 * var unit = {
 *   symbol: {
 *     value: 'Cel',
 *     type: 'http://www.opengis.net/def/uom/UCUM/'
 *   },
 *   label: {
 *     en: 'Degree Celsius'
 *   }
 * }
 * var str = CovUtils.stringifyUnit(unit) // str == '°C'
 *
 * @example
 * var unit = {
 *   label: {
 *     en: 'Degree Celsius',
 *     de: 'Grad Celsius'
 *   }
 * }
 * var str = CovUtils.stringifyUnit(unit, 'en') // str == 'Degree Celsius'
 */
export function stringifyUnit (unit, language) {
  if (!unit) {
    return ''
  }
  if (unit.symbol) {
    let symbol = unit.symbol.value || unit.symbol
    let scheme = unit.symbol.type
    if (scheme === 'http://www.opengis.net/def/uom/UCUM/') {
      if (symbol === 'Cel') {
        symbol = '°C'
      } else if (symbol === '1') {
        symbol = ''
      }
    }
    return symbol
  } else {
    return getLanguageString(unit.label, language)
  }
}
