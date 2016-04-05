import {COVERAGE} from './constants.js'
import {checkDomain, checkCoverage} from './validate.js'
import {subsetCoverageByIndex, subsetCoverageByValue} from './subset.js'

/**
 * Wraps a Domain into a Coverage object by adding dummy parameter and range data.
 * 
 * @param {Domain} domain the Domain object
 * @return {Coverage}
 */
export function toCoverage (domain) {
  checkDomain(domain)
  
  let dummyKey = 'foo'
  let dummyLabel = 'bar'
    
  let parameters = new Map()
  parameters.set(dummyKey, {
    key: dummyKey,
    observedProperty: {
      label: {en: dummyLabel}
    }
  })
  
  let shape = new Map([...domain.axes].map(([name, axis]) => [name, axis.values.length]))
  
  let loadRange = key => Promise.resolve({
    shape,
    dataType: 'float',
    // TODO have persistent range values + some pattern for x/y grids (checkerboard)
    get: obj => Math.random()
  })

  let cov = {
    type: COVERAGE,
    profiles: [],
    domainProfiles: domain.profiles,
    parameters,
    loadDomain: () => Promise.resolve(domain),
    loadRange
  }
  addLoadRangesFunction(cov)
  addSubsetFunctions(cov)
  return cov
}

function addSubsetFunctions (cov) {
  checkCoverage(cov)    
  cov.subsetByIndex = subsetCoverageByIndex.bind(null, cov)
  cov.subsetByValue = subsetCoverageByValue.bind(null, cov)
}

function addLoadRangesFunction (cov) {
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
