import {isISODateAxis, isLongitudeAxis, getLongitudeWrapper, asTime} from './referencing.js'
import {indexOfNearest, indicesOfNearest} from './array.js'
import {DOMAIN, COVERAGE} from './constants.js'

/**
 * After normalization, all constraints are start,stop,step objects.
 * It holds that stop > start, step > 0, start >= 0, stop >= 1.
 * For each axis, a constraint exists.
 */
export function normalizeIndexSubsetConstraints (domain, constraints) {
  // check and normalize constraints to simplify code
  let normalizedConstraints = {}
  for (let axisName in constraints) {
    if (!domain.axes.has(axisName)) {
      // TODO clarify cov behaviour in the JS API spec
      continue
    }
    if (constraints[axisName] === undefined || constraints[axisName] === null) {
      continue
    }
    if (typeof constraints[axisName] === 'number') {
      let constraint = constraints[axisName]
      normalizedConstraints[axisName] = {start: constraint, stop: constraint + 1}
    } else {
      normalizedConstraints[axisName] = constraints[axisName]
    }

    let {start = 0, 
         stop = domain.axes.get(axisName).values.length, 
         step = 1} = normalizedConstraints[axisName]
    if (step <= 0) {
      throw new Error(`Invalid constraint for ${axisName}: step=${step} must be > 0`)
    }
    if (start >= stop || start < 0) {
      throw new Error(`Invalid constraint for ${axisName}: stop=${stop} must be > start=${start} and both >= 0`)
    }
    normalizedConstraints[axisName] = {start, stop, step}
  }
  for (let axisName of domain.axes.keys()) {
    if (!(axisName in normalizedConstraints)) {
      let len = domain.axes.get(axisName).values.length
      normalizedConstraints[axisName] = {start: 0, stop: len, step: 1}
    }
  }
  return normalizedConstraints
}

export function subsetDomainByIndex (domain, constraints) {
  constraints = normalizeIndexSubsetConstraints(domain, constraints)
  
  // subset the axis arrays of the domain (immediately + cached)
  let newdomain = {
    type: DOMAIN,
    // TODO remove profiles in favour of domainType at some point
    // TODO are the profiles still valid?
    profiles: domain.profiles,
    domainType: domain.domainType,
    axes: new Map(domain.axes),
    referencing: domain.referencing
  }

  for (let axisName of Object.keys(constraints)) {
    let axis = domain.axes.get(axisName)
    let coords = axis.values
    let bounds = axis.bounds
    let constraint = constraints[axisName]
    let newcoords
    let newbounds

    let {start, stop, step} = constraint
    if (start === 0 && stop === coords.length && step === 1) {
      newcoords = coords
      newbounds = bounds
    } else if (step === 1) {
      // TypedArray has subarray which creates a view, while Array has slice which makes a copy
      if (coords.subarray) {
        newcoords = coords.subarray(start, stop)
      } else {
        newcoords = coords.slice(start, stop)
      }      
      if (bounds) {
        newbounds = {
          get: i => bounds.get(start + i)
        }
      }
    } else {
      let q = Math.trunc((stop - start) / step)
      let r = (stop - start) % step
      let len = q + r
      newcoords = new coords.constructor(len) // array or typed array
      for (let i=start, j=0; i < stop; i += step, j++) {
        newcoords[j] = coords[i]
      }
      if (bounds) {
        newbounds = {
          get: i => bounds.get(start + i*step)
        }
      }
    }
    
    let newaxis = {
      dataType: axis.dataType,
      components: axis.components,
      values: newcoords,
      bounds: newbounds
    }
    newdomain.axes.set(axisName, newaxis)
  }
  
  return newdomain
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
export function subsetCoverageByIndex (cov, constraints) {
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
      // TODO are the profiles still valid?
      domainProfiles: cov.domainProfiles,
      domainType: cov.domainType,
      parameters: cov.parameters,
      loadDomain: () => Promise.resolve(newdomain),
      loadRange,
      loadRanges
    }
    newcov.subsetByIndex = subsetCoverageByIndex.bind(null, newcov)
    newcov.subsetByValue = subsetCoverageByValue.bind(null, newcov)
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
 *   subsetByValue: constraints => subsetCoverageByValue(cov, constraints)
 * }
 */
export function subsetCoverageByValue (cov, constraints) {
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