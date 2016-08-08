import { COVERAGE, DOMAIN } from '../constants.js'
import { checkDomain, checkCoverage } from '../validate.js'
import { subsetByIndex, subsetByValue } from './subset.js'

/**
 * Wraps a Domain into a Coverage object by adding dummy parameter and range data.
 *
 * @param {Domain} domain the Domain object
 * @param {array} [options.gridAxes] The horizontal grid axis names, used for checkerboard pattern.
 * @return {Coverage}
 */
export function fromDomain (domain, options = {}) {
  checkDomain(domain)

  let {gridAxes: [x, y] = ['x', 'y']} = options

  let dummyKey = 'domain'
  let dummyLabel = 'Domain'

  let assumeGrid = domain.axes.has(x) && domain.axes.has(y) &&
    (domain.axes.get(x).values.length > 1 || domain.axes.get(y).values.length > 1)
  let categories
  let categoryEncoding
  const a = 'a'
  const av = 0
  const b = 'b'
  const bv = 1
  if (assumeGrid) {
    categories = [{
      id: a,
      label: {en: 'A'}
    }, {
      id: b,
      label: {en: 'B'}
    }]
    categoryEncoding = new Map([[a, [av]], [b, [bv]]])
  } else {
    categories = [{
      id: a,
      label: {en: 'X'}
    }]
    categoryEncoding = new Map([[a, [av]]])
  }

  let parameters = new Map()
  parameters.set(dummyKey, {
    key: dummyKey,
    observedProperty: {
      label: {en: dummyLabel},
      categories
    },
    categoryEncoding
  })

  let shape = new Map([...domain.axes].map(([name, axis]) => [name, axis.values.length]))

  let get
  if (assumeGrid) {
    // checkerboard pattern to see grid cells
    let isOdd = n => n % 2
    get = ({ x = 0, y = 0 }) => isOdd(x + y) ? av : bv
  } else {
    get = () => av
  }

  let loadRange = () => Promise.resolve({
    shape,
    dataType: 'integer',
    get
  })

  let cov = {
    type: COVERAGE,
    domainType: domain.domainType,
    parameters,
    loadDomain: () => Promise.resolve(domain),
    loadRange
  }
  addLoadRangesFunction(cov)
  addSubsetFunctions(cov)
  return cov
}

/**
 * Creates a Coverage with a single parameter from an xndarray object.
 *
 * @example
 * var arr = xndarray(new Float64Array(
 *   [ 1,2,3,
 *     4,5,6 ]), {
 *   shape: [2,3],
 *   names: ['y','x'],
 *   coords: {
 *     y: [10,12,14],
 *     x: [100,101,102],
 *     t: [new Date('2001-01-01')]
 *   }
 * })
 * var cov = CovUtils.fromXndarray(arr, {
 *   parameter: {
 *     key: 'temperature',
 *     observedProperty: {
 *       label: {en: 'Air temperature'}
 *     },
 *     unit: { symbol: '°C' }
 *   }
 * })
 * let param = cov.parameters.get('temperature')
 * let unit = param.unit.symbol // °C
 * cov.loadRange('temperature').then(temps => {
 *   let val = temps.get({x:0, y:1}) // val == 4
 * })
 *
 * @param {xndarray} xndarr - Coordinates must be primitive, not tuples etc.
 * @param {object} [options] Options object.
 * @param {Parameter} [options.parameter] Specifies the parameter, default parameter has a key of 'p1'.
 * @param {string} [options.domainType] A domain type URI.
 * @param {Array<object>} [options.referencing] Optional referencing system info,
 *   defaults to longitude/latitude in WGS84 for x/y axes and ISO8601 time strings for t axis.
 * @return {Coverage}
 */
export function fromXndarray (xndarr, options = {}) {
  let { parameter = {
    key: 'p1',
    observedProperty: {
      label: {en: 'Parameter 1'}
    }
  }, referencing, domainType} = options

  let parameters = new Map()
  parameters.set(parameter.key, parameter)

  // assume lon/lat/ISO time for x/y/t by default, for convenience
  if (!referencing) {
    referencing = []
    if (xndarr.coords.has('x') && xndarr.coords.has('y')) {
      referencing.push({
        coordinates: ['x', 'y'],
        system: {
          type: 'GeographicCRS',
          id: 'http://www.opengis.net/def/crs/OGC/1.3/CRS84'
        }
      })
    }
    if (xndarr.coords.has('t')) {
      referencing.push({
        coordinates: ['t'],
        system: {
          type: 'TemporalRS',
          calendar: 'Gregorian'
        }
      })
    }
  }

  let axes = new Map()
  for (let [axisName, vals1Dnd] of xndarr.coords) {
    let values = new Array(vals1Dnd.size)
    for (let i = 0; i < vals1Dnd.size; i++) {
      values[i] = vals1Dnd.get(i)
    }
    axes.set(axisName, {
      key: axisName,
      coordinates: [axisName],
      values
    })
  }

  let domain = {
    type: DOMAIN,
    domainType,
    referencing,
    axes
  }

  let shape = new Map([...domain.axes].map(([name, axis]) => [name, axis.values.length]))
  let dataType = xndarr.dtype.indexOf('int') !== -1 ? 'integer' : 'float'

  let loadRange = () => Promise.resolve({
    shape,
    dataType,
    get: xndarr.xget.bind(xndarr)
  })

  let cov = {
    type: COVERAGE,
    domainType,
    parameters,
    loadDomain: () => Promise.resolve(domain),
    loadRange
  }
  addLoadRangesFunction(cov)
  addSubsetFunctions(cov)
  return cov
}

export function addSubsetFunctions (cov) {
  checkCoverage(cov)
  cov.subsetByIndex = subsetByIndex.bind(null, cov)
  cov.subsetByValue = subsetByValue.bind(null, cov)
}

export function addLoadRangesFunction (cov) {
  checkCoverage(cov)
  function loadRanges (keys) {
    if (!keys) {
      keys = cov.parameters.keys()
    }
    return Promise.all([...keys].map(cov.loadRange)).then(ranges => new Map(keys.map((key, i) => [key, ranges[i]]))
    )
  }
  cov.loadRanges = loadRanges
}
