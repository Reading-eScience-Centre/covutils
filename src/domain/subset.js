import {DOMAIN} from '../constants.js'

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

export function subsetByIndex (domain, constraints) {
  constraints = normalizeIndexSubsetConstraints(domain, constraints)
  
  // subset the axis arrays of the domain (immediately + cached)
  let newdomain = {
    type: DOMAIN,
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
