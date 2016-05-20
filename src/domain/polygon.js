import processPolygon from 'point-in-big-polygon'
import {ringArea as ringAreaSpherical} from 'topojson/lib/topojson/spherical.js'
import {ringArea as ringAreaCartesian} from 'topojson/lib/topojson/cartesian.js'

/**
 * Modifies the point order of the given polygon rings such that the first ring is ordered
 * clockwise and all others anti-clockwise. Modification happens in-place. 
 * 
 * @param {Array} rings - Polygon rings to reorder (in-place)
 * @param {boolean} [isCartesian=false] - whether coordinates are cartesian or spherical degrees
 */
export function ensureClockwisePolygon (rings, isCartesian=false) {
  // first ring = exterior, clockwise
  // other rings = interior, anti-clockwise
  let ringAreaFn = isCartesian ? ringAreaCartesian : ringAreaSpherical
  for (let i=0; i < rings.length; i++) {
    let area = ringAreaFn(rings[i])
    if ((i === 0 && area < 0) || (i > 0 && area > 0)) {
      rings[i].reverse()
    }
  }
}

/**
 * Preprocesses an array of polygons to answer the point-in-polygon question efficiently.
 * 
 * @param {Array} polygons - A list of polygons where the exterior ring of each polygon is in clockwise and the interior rings in anti-clockwise order.
 * @return {function} A function classify(point) which returns the index of the first found polygon containing point, or -1 if not in any polygon.
 */
export function getPointInPolygonsFn (polygons) {
  let classifiers = polygons.map(processPolygon)
  let npolys = polygons.length
  
  return point => {
    for (let i=0; i < npolys; i++) {
      if (classifiers[i](point) <= 0) {
        return i
      }
    }
    return -1
  }
}