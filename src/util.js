import {ringArea as ringAreaSpherical} from 'topojson/lib/topojson/spherical.js'

/**
 * Shallow clone a given object.
 * 
 * Note: This does *not* handle all kinds of objects!
 * 
 * @ignore
 */
export function shallowcopy (obj) {
  let copy
  if (obj instanceof Map) {
    copy = new Map(obj)
  } else {
    copy = Object.create(Object.getPrototypeOf(obj))
    for (let prop in obj) {
      copy[prop] = obj[prop]
    } 
  }
  return copy
}

/**
 * 
 * @param {Array} rings - gets modified in-place, spherical coordinates in degrees 
 */
export function ensureClockwisePolygon (rings) {
  // first ring = exterior, clockwise
  // other rings = interior, anti-clockwise
  for (let i=0; i < rings.length; i++) {
    let area = ringAreaSpherical(rings[i])
    if ((i === 0 && area < 0) || (i > 0 && area > 0)) {
      rings[i].reverse()
    }
  }
}