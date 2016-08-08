import { COVERAGE, DOMAIN } from '../constants.js'
import { checkCoverage } from '../validate.js'
import { shallowcopy } from '../util.js'
import { addLoadRangesFunction } from './create.js'

/**
 * Returns a copy of the given Coverage object with the parameters
 * replaced by the supplied ones.
 *
 * Note that this is a low-level function and no checks are done on the supplied parameters.
 */
export function withParameters (cov, params) {
  let newcov = {
    type: COVERAGE,
    domainType: cov.domainType,
    parameters: params,
    loadDomain: () => cov.loadDomain(),
    loadRange: key => cov.loadRange(key),
    loadRanges: keys => cov.loadRanges(keys),
    subsetByIndex: constraints => cov.subsetByIndex(constraints).then(sub => withParameters(sub, params)),
    subsetByValue: constraints => cov.subsetByValue(constraints).then(sub => withParameters(sub, params))
  }
  return newcov
}

/**
 * Returns a copy of the given Coverage object with the categories
 * of a given parameter replaced by the supplied ones and the encoding
 * adapted to the given mapping from old to new.
 *
 * @param {Coverage} cov The Coverage object.
 * @param {String} key The key of the parameter to work with.
 * @param {object} observedProperty The new observed property including the new array of category objects
 *                           that will be part of the returned coverage.
 * @param {Map<String,String>} mapping A mapping from source category id to destination category id.
 * @returns {Coverage}
 */
export function withCategories (cov, key, observedProperty, mapping) {
  /* check breaks with Babel, see https://github.com/jspm/jspm-cli/issues/1348
  if (!(mapping instanceof Map)) {
    throw new Error('mapping parameter must be a Map from/to category ID')
  }
  */
  checkCoverage(cov)
  if (observedProperty.categories.some(c => !c.id)) {
    throw new Error('At least one category object is missing the "id" property')
  }
  let newparams = shallowcopy(cov.parameters)
  let newparam = shallowcopy(newparams.get(key))
  newparams.set(key, newparam)
  newparams.get(key).observedProperty = observedProperty

  let fromCatEnc = cov.parameters.get(key).categoryEncoding
  let catEncoding = new Map()
  let categories = observedProperty.categories
  for (let category of categories) {
    let vals = []
    for (let [fromCatId, toCatId] of mapping) {
      if (toCatId === category.id && fromCatEnc.has(fromCatId)) {
        vals.push(...fromCatEnc.get(fromCatId))
      }
    }
    if (vals.length > 0) {
      catEncoding.set(category.id, vals)
    }
  }
  newparams.get(key).categoryEncoding = catEncoding

  let newcov = withParameters(cov, newparams)
  return newcov
}

/**
 * Returns a new coverage where the domainType field of the coverage and the domain
 * is set to the given one.
 *
 * @param {Coverage} cov The Coverage object.
 * @param {String} domainType The new domain type.
 * @returns {Coverage}
 */
export function withDomainType (cov, domainType) {
  checkCoverage(cov)

  let domainWrapper = domain => {
    let newdomain = {
      type: DOMAIN,
      domainType,
      axes: domain.axes,
      referencing: domain.referencing
    }
    return newdomain
  }

  let newcov = {
    type: COVERAGE,
    domainType,
    parameters: cov.parameters,
    loadDomain: () => cov.loadDomain().then(domainWrapper),
    loadRange: key => cov.loadRange(key),
    loadRanges: keys => cov.loadRanges(keys),
    subsetByIndex: constraints => cov.subsetByIndex(constraints).then(sub => withDomainType(sub, domainType)),
    subsetByValue: constraints => cov.subsetByValue(constraints).then(sub => withDomainType(sub, domainType))
  }
  return newcov
}

/**
 * Tries to transform the given Coverage object into a new one that
 * conforms to one of the CovJSON domain types.
 * If multiple domain types match, then the "smaller" one is preferred,
 * for example, Point instead of Grid.
 *
 * The transformation consists of:
 * - Setting domainType in coverage and domain object
 * - Renaming domain axes
 *
 * @see https://github.com/Reading-eScience-Centre/coveragejson/blob/master/domain-types.md
 *
 * @param {Coverage} cov The Coverage object.
 * @returns {Promise<Coverage>}
 *   A Promise succeeding with the transformed coverage,
 *   or failing if no CovJSON domain type matched the input coverage.
 */
export function asCovJSONDomainType (cov) {
  return cov.loadDomain().then(domain => {

    // TODO implement me

  })
}

/**
 * @example
 * var cov = ...
 * var mapping = new Map()
 * mapping.set('lat', 'y').set('lon', 'x')
 * var newcov = CovUtils.renameAxes(cov, mapping)
 *
 * @param {Coverage} cov The coverage.
 * @param {Map<String,String>} mapping
 * @returns {Coverage}
 */
export function renameAxes (cov, mapping) {
  checkCoverage(cov)
  mapping = new Map(mapping)
  for (let axisName of cov.axes.keys()) {
    if (!mapping.has(axisName)) {
      mapping.set(axisName, axisName)
    }
  }

  let domainWrapper = domain => {
    let newaxes = new Map()
    for (let [from, to] of mapping) {
      let {dataType, coordinates, values, bounds} = domain.axes.get(from)
      let newaxis = {
        key: to,
        dataType,
        coordinates: coordinates.map(c => mapping.has(c) ? mapping.get(c) : c),
        values,
        bounds
      }
      newaxes.set(to, newaxis)
    }

    let newreferencing = domain.referencing.map(({coordinates, system}) => ({
      coordinates: coordinates.map(c => mapping.has(c) ? mapping.get(c) : c),
      system
    }))

    let newdomain = {
      type: DOMAIN,
      domainType: domain.domainType,
      axes: newaxes,
      referencing: newreferencing
    }
    return newdomain
  }

  // pre-compile for efficiency
  // get({['lat']: obj['y'], ['lon']: obj['x']})
  let getObjStr = [...mapping].map(([from, to]) => `['${from}']:obj['${to}']`).join(',')

  let rangeWrapper = range => {
    let get = new Function('range', 'return function get (obj){return range.get({' + getObjStr + '})}')(range) // eslint-disable-line
    let newrange = {
      shape: new Map([...range.shape].map(([name, len]) => [mapping.get(name), len])),
      dataType: range.dataType,
      get
    }
    return newrange
  }

  let loadRange = paramKey => cov.loadRange(paramKey).then(rangeWrapper)

  let loadRanges = paramKeys => cov.loadRanges(paramKeys)
    .then(ranges => new Map([...ranges].map(([paramKey, range]) => [paramKey, rangeWrapper(range)])))

  let newcov = {
    type: COVERAGE,
    domainType: cov.domainType,
    parameters: cov.parameters,
    loadDomain: () => cov.loadDomain().then(domainWrapper),
    loadRange,
    loadRanges,
    subsetByIndex: constraints => cov.subsetByIndex(constraints).then(sub => renameAxes(sub, mapping)),
    subsetByValue: constraints => cov.subsetByValue(constraints).then(sub => renameAxes(sub, mapping))
  }

  return newcov
}

/**
 * @param {Coverage} cov The coverage.
 * @param {String} key The key of the parameter for which the mapping should be applied.
 * @param {Function} fn A function getting called as fn(obj, range) where obj is the axis indices object
 *   and range is the original range object.
 * @param {String} [dataType] The new data type to use for the range. If omitted, the original type is used.
 * @returns {Coverage}
 */
export function mapRange (cov, key, fn, dataType) {
  checkCoverage(cov)

  let rangeWrapper = range => {
    let newrange = {
      shape: range.shape,
      dataType: dataType || range.dataType,
      get: obj => fn(obj, range)
    }
    return newrange
  }

  let loadRange = paramKey => key === paramKey ? cov.loadRange(paramKey).then(rangeWrapper) : cov.loadRange(paramKey)

  let loadRanges = paramKeys => cov.loadRanges(paramKeys)
    .then(ranges => new Map([...ranges].map(([paramKey, range]) => [paramKey, key === paramKey ? rangeWrapper(range) : range])))

  let newcov = {
    type: COVERAGE,
    domainType: cov.domainType,
    parameters: cov.parameters,
    loadDomain: () => cov.loadDomain(),
    loadRange,
    loadRanges,
    subsetByIndex: constraints => cov.subsetByIndex(constraints).then(sub => mapRange(sub, key, fn, dataType)),
    subsetByValue: constraints => cov.subsetByValue(constraints).then(sub => mapRange(sub, key, fn, dataType))
  }

  return newcov
}

/**
 *
 * @example
 * var cov = ... // has parameters 'NIR', 'red', 'green', 'blue'
 * var newcov = CovUtils.withDerivedParameter(cov, {
 *   parameter: {
 *     key: 'NDVI',
 *     observedProperty: {
 *       label: { en: 'Normalized Differenced Vegetation Index' }
 *     }
 *   },
 *   inputParameters: ['NIR','red'],
 *   dataType: 'float',
 *   fn: function (obj, nirRange, redRange) {
 *     var nir = nirRange.get(obj)
 *     var red = redRange.get(obj)
 *     if (nir === null || red === null) return null
 *     return (nir - red) / (nir + red)
 *   }
 * })
 */
export function withDerivedParameter (cov, options) {
  checkCoverage(cov)
  let {parameter, inputParameters, dataType = 'float', fn} = options

  let parameters = new Map(cov.parameters)
  parameters.set(parameter.key, parameter)

  let loadDerivedRange = () => cov.loadRanges(inputParameters).then(inputRanges => {
    let inputRangesArr = inputParameters.map(key => inputRanges.get(key))
    let shape = inputRangesArr[0].shape
    let range = {
      shape,
      dataType,
      get: obj => fn(obj, ...inputRangesArr)
    }
    return range
  })

  let loadRange = paramKey => parameter.key === paramKey ? loadDerivedRange() : cov.loadRange(paramKey)

  let newcov = {
    type: COVERAGE,
    domainType: cov.domainType,
    parameters,
    loadDomain: () => cov.loadDomain(),
    loadRange,
    subsetByIndex: constraints => cov.subsetByIndex(constraints).then(sub => withDerivedParameter(sub, options)),
    subsetByValue: constraints => cov.subsetByValue(constraints).then(sub => withDerivedParameter(sub, options))
  }
  addLoadRangesFunction(newcov)

  return newcov
}

/**
 *
 * @example
 * var cov = ... // has parameters 'NIR', 'red', 'green', 'blue'
 * var newcov = CovUtils.withSimpleDerivedParameter(cov, {
 *   parameter: {
 *     key: 'NDVI',
 *     observedProperty: {
 *       label: { en: 'Normalized Differenced Vegetation Index' }
 *     }
 *   },
 *   inputParameters: ['NIR','red'],
 *   dataType: 'float',
 *   fn: function (nir, red) {
 *     return (nir - red) / (nir + red)
 *   }
 * })
 */
export function withSimpleDerivedParameter (cov, options) {
  let {parameter, inputParameters, dataType, fn} = options
  let options_ = {
    parameter,
    inputParameters,
    dataType,
    // TODO pre-compile if too slow
    fn: (obj, ...ranges) => {
      let vals = inputParameters.map((_, i) => ranges[i].get(obj))
      if (vals.some(val => val === null)) {
        return null
      }
      return fn(...vals)
    }
  }
  return withDerivedParameter(cov, options_)
}
