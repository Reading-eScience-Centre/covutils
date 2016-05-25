import {isISODateAxis, isLongitudeAxis, getLongitudeWrapper, asTime} from '../domain/referencing.js'
import {normalizeIndexSubsetConstraints, subsetByIndex as subsetDomainByIndex} from '../domain/subset.js'
import {indexOfNearest, indicesOfNearest} from '../array.js'
import {COVERAGE} from '../constants.js'

/**
 * Returns a copy of the grid coverage subsetted to the given bounding box.
 * 
 * Any grid cell is included which intersects with the bounding box. 
 * 
 * @param {Coverage} cov A Coverage object with domain Grid.
 * @param {array} bbox [xmin,ymin,xmax,ymax] in native CRS coordinates.
 * @param {array} [axes=['x','y']] Axis names [x,y]. 
 * @returns {Promise<Coverage>} A promise with a Coverage object as result.
 */
export function subsetByBbox (cov, bbox, axes=['x','y']) {
  let [xmin,ymin,xmax,ymax] = bbox
  return cov.subsetByValue({[axes[0]]: {start: xmin, stop: xmax}, [axes[1]]: {start: ymin, stop: ymax}})
}

/**
 * Generic subsetByIndex function that can be used when building new Coverage objects.
 * 
 * @example
 * var cov = {
 *   type: 'Coverage',
 *   ...
 *   subsetByIndex: constraints => subsetCoverageByIndex(cov, constraints)
 * }
 */
export function subsetByIndex (cov, constraints) {
  return cov.loadDomain().then(domain => {
    constraints = normalizeIndexSubsetConstraints(domain, constraints)
    let newdomain = subsetDomainByIndex(domain, constraints)

    // subset ranges (on request)
    let rangeWrapper = range => {
      let newrange = {
        dataType: range.dataType,
        get: obj => {
          // translate subsetted to original indices
          let newobj = {}
          for (let axisName of Object.keys(obj)) {
            let {start, step} = constraints[axisName]
            newobj[axisName] = start + obj[axisName]*step
          }
          return range.get(newobj)
        }
      }
      newrange.shape = new Map()
      for (let axisName of domain.axes.keys()) {
        let size = newdomain.axes.get(axisName).values.length
        newrange.shape.set(axisName, size)
      }
      return newrange
    }
    
    let loadRange = key => cov.loadRange(key).then(rangeWrapper)
    
    let loadRanges = keys => cov.loadRanges(keys).then(ranges => 
      new Map([...ranges].map(([key, range]) => [key, rangeWrapper(range)]))
    )
    
    // assemble everything to a new coverage
    let newcov = {
      type: COVERAGE,
      domainType: cov.domainType,
      parameters: cov.parameters,
      loadDomain: () => Promise.resolve(newdomain),
      loadRange,
      loadRanges
    }
    newcov.subsetByIndex = subsetByIndex.bind(null, newcov)
    newcov.subsetByValue = subsetByValue.bind(null, newcov)
    return newcov
  })
}

/**
 * Generic subsetByValue function that can be used when building new Coverage objects.
 * Requires cov.subsetByIndex function.
 * 
 * @example
 * var cov = {
 *   type: 'Coverage',
 *   ...
 *   subsetByValue: constraints => subsetByValue(cov, constraints)
 * }
 */
export function subsetByValue (cov, constraints) {
  return cov.loadDomain().then(domain => {
    // calculate indices and use subsetByIndex
    let indexConstraints = {}
    
    for (let axisName of Object.keys(constraints)) {
      let spec = constraints[axisName]
      if (spec === undefined || spec === null || !domain.axes.has(axisName)) {
        continue
      }
      let axis = domain.axes.get(axisName)
      let vals = axis.values
      
      // special-case handling
      let isISODate = isISODateAxis(domain, axisName)
      let isLongitude = isLongitudeAxis(domain, axisName)
      
      // wrap input longitudes into longitude range of domain axis
      let lonWrapper = isLongitude ? getLongitudeWrapper(domain, axisName) : undefined
      
      if (typeof spec === 'number' || typeof spec === 'string' || spec instanceof Date) {
        let match = spec
        if (isISODate) {
          // convert times to numbers before searching
          match = asTime(match)
          vals = vals.map(v => new Date(v).getTime())
        } else if (isLongitude) {
          match = lonWrapper(match)
        }
        let i
        // older browsers don't have TypedArray.prototype.indexOf
        if (vals.indexOf) {
          i = vals.indexOf(match)
        } else {
          i = Array.prototype.indexOf.call(vals, match)
        }
        if (i === -1) {
          throw new Error('Domain value not found: ' + spec)
        }
        indexConstraints[axisName] = i
        
      } else if ('target' in spec) {
        // find index of value closest to target
        let target = spec.target
        if (isISODate) {
          // convert times to numbers before searching
          target = asTime(target)
          vals = vals.map(v => new Date(v).getTime())
        } else if (isLongitude) {
          target = lonWrapper(target)
        } else if (typeof vals[0] !== 'number' || typeof target !== 'number') {
          throw new Error('Invalid axis or constraint value type')
        }
        let i = indexOfNearest(vals, target)
        indexConstraints[axisName] = i
        
      } else if ('start' in spec && 'stop' in spec) {
        // TODO what about bounds?
        
        let {start,stop} = spec
        if (isISODate) {
          // convert times to numbers before searching
          [start, stop] = [asTime(start), asTime(stop)]
          vals = vals.map(v => new Date(v).getTime())
        } else if (isLongitude) {
          [start, stop] = [lonWrapper(start), lonWrapper(stop)]
        } else if (typeof vals[0] !== 'number' || typeof start !== 'number') {
          throw new Error('Invalid axis or constraint value type')
        }
        
        let [lo1,hi1] = indicesOfNearest(vals, start)
        let [lo2,hi2] = indicesOfNearest(vals, stop)
        
        // cov is a bit arbitrary and may include one or two indices too much
        // (but since we don't handle bounds it doesn't matter that much)
        let imin = Math.min(lo1,hi1,lo2,hi2)
        let imax = Math.max(lo1,hi1,lo2,hi2) + 1 // subsetByIndex is exclusive
        
        indexConstraints[axisName] = {start: imin, stop: imax}
      } else {
        throw new Error('Invalid subset constraints')
      }
    }
    
    return cov.subsetByIndex(indexConstraints)
  })
}