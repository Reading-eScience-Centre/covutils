import {COVERAGECOLLECTION} from '../constants.js'
import {asTime, isISODateAxis, isLongitudeAxis, getLongitudeWrapper} from '../domain/referencing.js'

/**
 * Adds a basic query() function to the coverage collection object.
 * Note that this does not support paging.
 */
export function addCollectionQueryFunction (collection) {
  if (collection.paging) {
    throw new Error('Paged collections not supported')
  }
  collection.query = () => new CollectionQuery(collection)
}

export class CollectionQuery {
  /**
   * @param {CoverageCollection} collection
   */
  constructor (collection) {
    this._collection = collection
    this._filter = {}
    this._subset = {}
  }
  
  /**
   * Matching mode: intersect
   * 
   * Supports ISO8601 date string axes.
   * All other string-type axes are compared alphabetically.
   * 
   * @example
   * collection.query().filter({
   *   't': {start: '2015-01-01T01:00:00', stop: '2015-01-01T02:00:00'}
   * }).execute().then(filteredCollection => {
   *   console.log(filteredCollection.coverages.length)
   * })
   * @param {Object} spec
   * @return {CollectionQuery}
   */
  filter (spec) {
    mergeInto(spec, this._filter)
    return this
  }
  
  /**
   * Subset coverages by domain values.
   * 
   * Equivalent to calling {@link Coverage.subsetByValue}(spec) on each
   * coverage in the collection.
   * 
   * @param {Object} spec
   * @return {CollectionQuery}
   */
  subset (spec) {
    mergeInto(spec, this._subset)
    return this
  }
  
  /**
   * Applies the query operators and returns
   * a Promise that succeeds with a new CoverageCollection.
   * 
   * @return {Promise<CoverageCollection>}
   */
  execute () {
    let coll = this._collection
    let newcoll = {
      type: COVERAGECOLLECTION,
      coverages: [],
      parameters: coll.parameters,
      domainType: coll.domainType
    }
    
    let promises = []
    for (let cov of coll.coverages) {
      promises.push(cov.loadDomain().then(domain => {
        if (!matchesFilter(domain, this._filter)) {
          return
        }
        
        if (Object.keys(this._subset).length === 0) {
          newcoll.coverages.push(cov)
        } else {
          return cov.subsetByValue(this._subset).then(subsetted => {
            newcoll.coverages.push(subsetted)
          })
        }
      }))
    }
    return Promise.all(promises).then(() => {
      newcoll.query = () => new CollectionQuery(newcoll)
      return newcoll
    })
  }
}

function matchesFilter (domain, filter) {
  for (let axisName of Object.keys(filter)) {
    let condition = filter[axisName]
    if (!domain.axes.has(axisName)) {
      throw new Error('Axis "' + axisName + '" does not exist')
    }
    let axis = domain.axes.get(axisName)
    let vals = axis.values
    
    let [min,max] = [vals[0],vals[vals.length-1]]
    if (typeof min !== 'number' && typeof min !== 'string') {
      throw new Error('Can only filter primitive axis values')
    }
    let {start,stop} = condition
    
    // special handling
    if (isISODateAxis(domain, axisName)) {
      [min,max] = [asTime(min), asTime(max)]
      [start,stop] = [asTime(start), asTime(stop)]
    } else if (isLongitudeAxis(domain, axisName)) {
      let lonWrapper = getLongitudeWrapper(domain, axisName)
      [start,stop] = [lonWrapper(start), lonWrapper(stop)]
    }
    
    if (min > max) {
      [min,max] = [max,min]
    }
    if (max < start || stop < min) {
      return false
    }
  }
  
  return true
}

function mergeInto (inputObj, targetObj) {
  for (let k of Object.keys(inputObj)) {
    targetObj[k] = inputObj[k]
  }
}
