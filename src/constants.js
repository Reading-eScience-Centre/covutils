export const DOMAIN = 'Domain'
export const COVERAGE = 'Coverage'
export const COVERAGECOLLECTION = COVERAGE + 'Collection'

const COVJSON_PREFIX = 'http://coveragejson.org/def#'
//FIXME these should maybe live under a different namespace (Polygon collides with the same-named domain type)
export const COVJSON_DATATYPE_TUPLE = COVJSON_PREFIX + 'Tuple'
export const COVJSON_DATATYPE_POLYGON = COVJSON_PREFIX + 'Polygon'