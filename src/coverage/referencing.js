import { shallowcopy } from '../util.js'
import { COVJSON_DATATYPE_TUPLE, COVERAGE, DOMAIN } from '../constants.js'
import { getHorizontalCRSReferenceObject, getProjection } from '../domain/referencing.js'

/**
 * Reproject a coverage.
 *
 * Reprojecting means returning a new coverage where the horizontal CRS is replaced
 * and the horizontal domain coordinates are reprojected.
 *
 * Current limitations:
 * - only point-type coverage domains are supported (Tuple only)
 * - only horizontal CRSs (2-dimensional) are supported
 * - non-lat/lon CRSs have to be pre-cached with loadProjection()
 *
 * @param {Coverage} cov The Coverage object to reproject.
 * @param {Domain} refDomain The reference domain from which the horizontal CRS is used.
 * @returns {Promise<Coverage>} A promise with the reprojected Coverage object as result.
 */
export function reproject (cov, refDomain) {
  return cov.loadDomain().then(sourceDomain => {
    let sourceRef = getHorizontalCRSReferenceObject(sourceDomain)
    if (sourceRef.components.length > 2) {
      throw new Error('Reprojection not supported for >2D CRSs')
    }
    // check that the CRS components don't refer to grid axes
    if (sourceRef.components.some(sourceDomain.axes.has)) {
      throw new Error('Grid reprojection not supported yet')
    }
    let [xComp, yComp] = sourceRef.components

    // TODO reproject bounds

    // find the composite axis that contains the horizontal coordinates
    let axes = [...sourceDomain.axes.values()]
    let axis = axes.find(axis => sourceRef.components.every(comp => axis.components.indexOf(comp) !== -1))
    let [xCompIdx, yCompIdx] = [axis.components.indexOf(xComp), axis.components.indexOf(yComp)]

    // find the target CRS and get the projection
    let sourceProjection = getProjection(sourceDomain)
    let targetProjection = getProjection(refDomain)

    // reproject the x/y part of every axis value
    // this is done by unprojecting to lon/lat, followed by projecting to the target x/y
    let values
    if (axis.dataType === COVJSON_DATATYPE_TUPLE) {
      // make a deep copy of the axis values and replace x,y values by the reprojected ones
      values = axis.values.map(tuple => tuple.slice())
      for (let tuple of values) {
        let [sourceX, sourceY] = [tuple[xCompIdx], tuple[yCompIdx]]
        let latlon = sourceProjection.unproject({x: sourceX, y: sourceY})
        let {x, y} = targetProjection.project(latlon)
        tuple[xCompIdx] = x
        tuple[yCompIdx] = y
      }
    } else {
      throw new Error('Unsupported data type: ' + axis.dataType)
    }

    // assemble reprojected coverage
    let newAxes = new Map(sourceDomain.axes)
    let newAxis = shallowcopy(axis)
    delete newAxis.bounds
    newAxis.values = values
    newAxes.set(axis.key, newAxis)

    let targetRef = getHorizontalCRSReferenceObject(refDomain)
    if (targetRef.components.length > 2) {
      throw new Error('Reprojection not supported for >2D CRSs')
    }
    let newReferencing = sourceDomain.referencing.map(ref => {
      if (ref === sourceRef) {
        return {
          components: sourceRef.components,
          system: targetRef.system
        }
      } else {
        return ref
      }
    })

    let newDomain = {
      type: DOMAIN,
      domainType: sourceDomain.domainType,
      axes: newAxes,
      referencing: newReferencing
    }

    let newCoverage = {
      type: COVERAGE,
      domainType: cov.domainType,
      parameters: cov.parameters,
      loadDomain: () => Promise.resolve(newDomain),
      loadRange: paramKey => cov.loadRange(paramKey),
      loadRanges: paramKeys => cov.loadRanges(paramKeys),
      subsetByIndex: constraints => cov.subsetByIndex(constraints).then(sub => reproject(sub, refDomain)),
      subsetByValue: constraints => cov.subsetByValue(constraints).then(sub => reproject(sub, refDomain))
    }
    return newCoverage
  })
}
