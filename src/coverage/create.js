import {COVERAGE} from '../constants.js'
import {checkDomain, checkCoverage} from '../validate.js'
import {subsetByIndex, subsetByValue} from './subset.js'

/**
 * Wraps a Domain into a Coverage object by adding dummy parameter and range data.
 * 
 * @param {Domain} domain the Domain object
 * @param {array} [options.gridAxes] The horizontal grid axis names, used for checkerboard pattern.
 * @return {Coverage}
 */
export function fromDomain (domain, options={}) {
  checkDomain(domain)
  
  let {
    gridAxes: [x,y] = ['x','y']
  } = options
  
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
    get = ({x=0, y=0}) => isOdd(x+y) ? av : bv
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
    // TODO remove domainProfiles in favour of domainType at some point
    domainProfiles: domain.profiles,
    domainType: domain.domainType,
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
    return Promise.all([...keys].map(cov.loadRange)).then(ranges =>
      new Map(keys.map((key,i) => [key,ranges[i]]))
    )
  }
  cov.loadRanges = loadRanges
}
