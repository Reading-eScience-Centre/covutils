import processPolygon from 'point-in-big-polygon'
import rewind from '@mapbox/geojson-rewind'

/**
 * Modifies the point order of the given polygon rings such that the first ring is ordered
 * clockwise and all others anti-clockwise. Modification happens in-place.
 * Coordinates must be in longitude-latitude order in degrees.
 *
 * @param {Array} rings - Polygon rings to reorder (in-place)
 */
export function ensureClockwisePolygon (rings) {
  // first ring = exterior, clockwise
  // other rings = interior, anti-clockwise
  let gj = {
    type: 'Polygon',
    coordinates: rings
  }
  let outerClockwise = true
  rewind(gj, outerClockwise)
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
    for (let i = 0; i < npolys; i++) {
      if (classifiers[i](point) <= 0) {
        return i
      }
    }
    return -1
  }
}
