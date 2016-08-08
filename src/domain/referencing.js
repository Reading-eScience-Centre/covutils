import * as uriproj from 'uriproj'
import { COVJSON_DATATYPE_TUPLE, COVJSON_DATATYPE_POLYGON } from '../constants.js'

const OPENGIS_CRS_PREFIX = 'http://www.opengis.net/def/crs/'

/** 3D WGS84 in lat-lon-height order */
const EPSG4979 = OPENGIS_CRS_PREFIX + 'EPSG/0/4979'

/** 2D WGS84 in lat-lon order */
const EPSG4326 = OPENGIS_CRS_PREFIX + 'EPSG/0/4326'

/** 2D WGS84 in lon-lat order */
const CRS84 = OPENGIS_CRS_PREFIX + 'OGC/1.3/CRS84'

/** CRSs in which position is specified by geodetic latitude and longitude */
const GeographicCRSs = [EPSG4979, EPSG4326, CRS84]

/** Position of longitude axis */
const LongitudeAxisIndex = {
  [EPSG4979]: 1,
  [EPSG4326]: 1,
  [CRS84]: 0
}

/**
 * Return the reference system connection object for the given domain coordinate ID,
 * or undefined if none exists.
 */
export function getReferenceObject (domain, coordinateId) {
  let ref = domain.referencing.find(ref => ref.coordinates.indexOf(coordinateId) !== -1)
  return ref
}

/**
 * Return the reference system connection object of the horizontal CRS of the domain,
 * or ``undefined`` if none found.
 * A horizontal CRS is either geodetic (typically ellipsoidal, meaning lat/lon)
 * or projected, and may be 2D or 3D (including height).
 */
export function getHorizontalCRSReferenceObject (domain) {
  let isHorizontal = ref =>
    ['GeodeticCRS', 'GeographicCRS', 'GeocentricCRS', 'ProjectedCRS'].indexOf(ref.system.type) !== -1
  let ref = domain.referencing.find(isHorizontal)
  return ref
}

/**
 * Return whether the reference system is a CRS in which
 * horizontal position is specified by geodetic latitude and longitude.
 */
export function isEllipsoidalCRS (rs) {
  return rs.type === 'GeographicCRS' || GeographicCRSs.indexOf(rs.id) !== -1
}

/**
 * Return a projection object based on the CRS found in the coverage domain.
 * If no CRS is found or it is unsupported, then ``undefined`` is returned.
 * For non-built-in projections, this function returns already-cached projections
 * that were loaded via {@link loadProjection}.
 *
 * A projection converts between geodetic lat/lon and projected x/y values.
 *
 * For lat/lon CRSs the projection is defined such that an input lat/lon
 * position gets projected/wrapped to the longitude range used in the domain, for example
 * [0,360]. The purpose of this is to make intercomparison between different coverages easier.
 *
 * The following limitations currently apply:
 * - only primitive axes and Tuple/Polygon composite axes are supported for lat/lon CRSs
 *
 * @param {Domain} domain A coverage domain object.
 * @return {IProjection} A stripped-down Leaflet IProjection object.
 */
export function getProjection (domain) {
  let isEllipsoidal = domain.referencing.some(ref => isEllipsoidalCRS(ref.system))
  if (isEllipsoidal) {
    return getLonLatProjection(domain)
  }

  // try to get projection via uriproj library
  let ref = getHorizontalCRSReferenceObject(domain)
  if (!ref) {
    throw new Error('No horizontal CRS found in coverage domain')
  }

  let uri = ref.system.id
  let proj = uriproj.get(uri)
  if (!proj) {
    throw new Error('Projection ' + uri + ' not cached in uriproj, use loadProjection() instead')
  }
  return wrapProj4(proj)
}

/**
 * Like {@link getProjection} but will also try to remotely load a projection definition via the uriproj library.
 * On success, the loaded projection is automatically cached for later use and can be directly requested
 * with {@link getProjection}.
 *
 * @param {Domain} domain A coverage domain object.
 * @return {Promise<IProjection>} A Promise succeeding with a stripped-down Leaflet IProjection object.
 */
export function loadProjection (domain) {
  try {
    // we try the local one first so that we get our special lon/lat projection (which doesn't exist in uriproj)
    return getProjection(domain)
  } catch (e) {}

  // try to load projection remotely via uriproj library
  let ref = getHorizontalCRSReferenceObject(domain)
  if (!ref) {
    throw new Error('No horizontal CRS found in coverage domain')
  }

  let uri = ref.system.id
  return uriproj.load(uri).then(proj => wrapProj4(proj))
}

/**
 * Return the coordinate IDs of the horizontal CRS of the domain.
 *
 * @deprecated use getHorizontalCRSCoordinateIDs
 * @example
 * var [xComp,yComp] = getHorizontalCRSComponents(domain)
 */
export function getHorizontalCRSComponents (domain) {
  return getHorizontalCRSCoordinateIDs(domain)
}

/**
 * Return the coordinate IDs of the horizontal CRS of the domain.
 *
 * @example
 * var [xComp,yComp] = getHorizontalCRSCoordinateIDs(domain)
 */
export function getHorizontalCRSCoordinateIDs (domain) {
  let ref = getHorizontalCRSReferenceObject(domain)
  return ref.coordinates
}

/**
 * Wraps a proj4 Projection object into an IProjection object.
 */
function wrapProj4 (proj) {
  return {
    project: ({lon, lat}) => {
      let [x, y] = proj.forward([lon, lat])
      return {x, y}
    },
    unproject: ({x, y}) => {
      let [lon, lat] = proj.inverse([x, y])
      return {lon, lat}
    }
  }
}

function getLonLatProjection (domain) {
  let ref = domain.referencing.find(ref => isEllipsoidalCRS(ref.system))
  let lonIdx = LongitudeAxisIndex[ref.system.id]
  if (lonIdx > 1) {
    // this should never happen as longitude is always the first or second axis
    throw new Error()
  }

  let lonComponent = ref.coordinates[lonIdx]

  // we find the min and max longitude occuring in the domain by inspecting the axis values
  // Note: this is inefficient for big composite axes.
  //       In that case, something like a domain extent might help which has the min/max values for each component.
  // TODO handle bounds
  let lonMin, lonMax
  if (domain.axes.has(lonComponent)) {
    // longitude is a grid axis
    let lonAxisName = lonComponent
    let lonAxisVals = domain.axes.get(lonAxisName).values
    lonMin = lonAxisVals[0]
    lonMax = lonAxisVals[lonAxisVals.length - 1]
    if (lonMin > lonMax) {
      [lonMin, lonMax] = [lonMax, lonMin]
    }
  } else {
    // TODO there should be no dependency to CovJSON

    // longitude is not a primitive grid axis but a component of a composite axis

    // find the composite axis containing the longitude component
    let axes = [...domain.axes.values()]
    let axis = axes.find(axis => axis.coordinates.indexOf(lonComponent) !== -1)
    let lonCompIdx = axis.coordinates.indexOf(lonComponent)

    // scan the composite axis for min/max longitude values
    lonMin = Infinity
    lonMax = -Infinity
    if (axis.dataType === COVJSON_DATATYPE_TUPLE) {
      for (let tuple of axis.values) {
        let lon = tuple[lonCompIdx]
        lonMin = Math.min(lon, lonMin)
        lonMax = Math.max(lon, lonMax)
      }
    } else if (axis.dataType === COVJSON_DATATYPE_POLYGON) {
      for (let poly of axis.values) {
        for (let ring of poly) {
          for (let point of ring) {
            let lon = point[lonCompIdx]
            lonMin = Math.min(lon, lonMin)
            lonMax = Math.max(lon, lonMax)
          }
        }
      }
    } else {
      throw new Error('Unsupported data type: ' + axis.dataType)
    }
  }

  let lonMid = (lonMax + lonMin) / 2
  let lonMinExtended = lonMid - 180
  let lonMaxExtended = lonMid + 180

  return {
    project: ({lon, lat}) => {
      let lonProjected
      if (lonMinExtended <= lon && lon <= lonMaxExtended) {
        // use unchanged to avoid introducing rounding errors
        lonProjected = lon
      } else {
        lonProjected = ((lon - lonMinExtended) % 360 + 360) % 360 + lonMinExtended
      }

      let [x, y] = lonIdx === 0 ? [lonProjected, lat] : [lat, lonProjected]
      return {x, y}
    },
    unproject: ({x, y}) => {
      let [lon, lat] = lonIdx === 0 ? [x, y] : [y, x]
      return {lon, lat}
    }
  }
}

/**
 * Reprojects coordinates from one projection to another.
 */
export function reprojectCoords (pos, fromProjection, toProjection) {
  return toProjection.project(fromProjection.unproject(pos))
}

/**
 * Returns a function which converts an arbitrary longitude to the
 * longitude extent used in the coverage domain.
 * This only supports primitive axes since this is what subsetByValue supports.
 * The longitude extent is extended to 360 degrees if the actual extent is smaller.
 * The extension is done equally on both sides of the extent.
 *
 * For example, the domain may have longitudes within [0,360].
 * An input longitude of -70 is converted to 290.
 * All longitudes within [0,360] are returned unchanged.
 *
 * If the domain has longitudes within [10,50] then the
 * extended longitude range is [-150,210] (-+180 from the middle point).
 * An input longitude of -170 is converted to 190.
 * All longitudes within [-150,210] are returned unchanged.
 *
 * @ignore
 */
export function getLongitudeWrapper (domain, axisName) {
  // TODO deprecate this in favour of getProjection, check leaflet-coverage

  // for primitive axes, the axis identifier = component identifier
  if (!isLongitudeAxis(domain, axisName)) {
    throw new Error(`'${axisName}' is not a longitude axis`)
  }

  let vals = domain.axes.get(axisName).values
  let lon_min = vals[0]
  let lon_max = vals[vals.length - 1]
  if (lon_min > lon_max) {
    [lon_min, lon_max] = [lon_max, lon_min]
  }

  let x_mid = (lon_max + lon_min) / 2
  let x_min = x_mid - 180
  let x_max = x_mid + 180

  return lon => {
    if (x_min <= lon && lon <= x_max) {
      // directly return to avoid introducing rounding errors
      return lon
    } else {
      return ((lon - x_min) % 360 + 360) % 360 + x_min
    }
  }
}

/**
 * Return whether the given domain axis represents longitudes.
 *
 * @ignore
 */
export function isLongitudeAxis (domain, axisName) {
  let ref = getReferenceObject(domain, axisName)
  if (!ref) {
    return false
  }

  let crsId = ref.system.id
  // TODO should support unknown CRSs with embedded axis information
  if (GeographicCRSs.indexOf(crsId) === -1) {
    // this also covers the case when there is no ID property
    return false
  }

  let compIdx = ref.coordinates.indexOf(axisName)
  let isLongitude = LongitudeAxisIndex[crsId] === compIdx
  return isLongitude
}

/**
 * Returns true if the given axis has ISO8601 date strings
 * as axis values.
 */
export function isISODateAxis (domain, axisName) {
  let val = domain.axes.get(axisName).values[0]
  if (typeof val !== 'string') {
    return false
  }
  return !isNaN(new Date(val).getTime())
}

export function asTime (inp) {
  let res
  let err = false
  if (typeof inp === 'string') {
    res = new Date(inp).getTime()
  } else if (inp instanceof Date) {
    res = inp.getTime()
  } else {
    err = true
  }
  if (isNaN(res)) {
    err = true
  }
  if (err) {
    throw new Error('Invalid date: ' + inp)
  }
  return res
}
