import ndarray from 'ndarray'

import { mapRange } from './transform.js'
import { checkCoverage } from '../validate.js'
import { ensureClockwisePolygon, getPointInPolygonsFn } from '../domain/polygon.js'

/**
 * Returns a copy of the given Coverage object where the
 * range values which belong to domain areas outside the
 * given polygon are returned as null (no data).
 *
 * @param {Coverage} cov A Coverage object with geographic CRS.
 * @param {Object} polygon A GeoJSON Polygon or MultiPolygon object.
 * @param {array} [axes=['x','y']] The grid axes corresponding to longitude and latitude coordinates.
 * @returns {Promise<Coverage>}
 */
export function maskByPolygon (cov, polygon, axes = ['x', 'y']) {
  checkCoverage(cov)

  if (polygon.type === 'Polygon') {
    polygon = {
      type: 'MultiPolygon',
      coordinates: [polygon.coordinates]
    }
  }
  // prepare polygon coordinates for point-in-big-polygon algorithm
  let polygons = polygon.coordinates // .map(poly => poly.map(loop => loop.slice(0, loop.length - 1)))
  polygons.forEach(p => ensureClockwisePolygon(p))

  let pip = getPointInPolygonsFn(polygons)

  let [X, Y] = axes

  return cov.loadDomain().then(domain => {
    let x = domain.axes.get(X).values
    let y = domain.axes.get(Y).values
    let pnpolyCache = ndarray(new Uint8Array(x.length * y.length), [x.length, y.length])

    for (let i = 0; i < x.length; i++) {
      for (let j = 0; j < y.length; j++) {
        let inside = pip([x[i], y[j]]) >= 0
        pnpolyCache.set(i, j, inside)
      }
    }

    let fn = (obj, range) => {
      if (pnpolyCache.get(obj[X] || 0, obj[Y] || 0)) {
        return range.get(obj)
      } else {
        return null
      }
    }

    let newcov = cov
    for (let key of cov.parameters.keys()) {
      newcov = mapRange(newcov, key, fn)
    }
    return newcov
  })
}
