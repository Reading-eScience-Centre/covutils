export function minMax (arr) {
  var len = arr.length
  var min = Infinity
  var max = -Infinity
  while (len--) {
    var el = arr[len]
    if (el == null) {
      // do nothing
    } else if (el < min) {
      min = el
    } else if (el > max) {
      max = el
    }
  }
  if (min === Infinity) {
    min = max
  } else if (max === -Infinity) {
    max = min
  }
  if (min === Infinity || min === -Infinity) {
    // all values were null
    min = null
    max = null
  }
  return [min, max]
}

/***
 * Return the indices of the two neighbors in the sorted array closest to the given number.
 * 
 * @example
 * var a = [2,5,8,12,13]
 * var i = CovUtils.indicesOfNearest(a, 6)
 * // i == [1,2]
 * var j = CovUtils.indicesOfNearest(a, 5)
 * // j == [1,1]
 * var k = CovUtils.indicesOfNearest(a, 50)
 * // k == [4,4] 
 * 
 * @param {Array<number>} a The array to search through. Must be sorted, ascending or descending.
 * @param {number} x The target number.
 * @return {[lo,hi]} The indices of the two closest values, may be equal.
 *   If `x` exists in the array, both neighbors point to `x`.
 *   If `x` is lower (greater if descending) than the first value, both neighbors point to 0.
 *   If `x` is greater (lower if descending) than the last value, both neighbors point to the last index.
 */
export function indicesOfNearest (a, x) {
  if (a.length === 0) {
    throw new Error('Array must have at least one element')
  }
  var lo = -1
  var hi = a.length
  const ascending = a.length === 1 || a[0] < a[1]
  // we have two separate code paths to help the runtime optimize the loop
  if (ascending) {
    while (hi - lo > 1) {
      let mid = Math.round((lo + hi) / 2)
      if (a[mid] <= x) {
        lo = mid
      } else {
        hi = mid
      }
    }
  } else {
    while (hi - lo > 1) {
      let mid = Math.round((lo + hi) / 2)
      if (a[mid] >= x) { // here's the difference
        lo = mid
      } else {
        hi = mid
      }
    }
  }
  if (a[lo] === x) hi = lo
  if (lo === -1) lo = hi
  if (hi === a.length) hi = lo
  return [lo, hi]
}

/**
 * Return the index of the value closest to the given number in a sorted array.
 * 
 * @example
 * var a = [2,5,8,12,13]
 * var i = CovUtils.indexOfNearest(a, 6)
 * // i == 1
 * var j = CovUtils.indexOfNearest(a, 7)
 * // j == 2
 * var k = CovUtils.indexOfNearest(a, 50)
 * // k == 4
 * 
 * @param {Array<number>} a The array to search through. Must be sorted, ascending or descending.
 * @param {number} x The target number.
 * @return {number} The array index whose value is closest to `x`.
 *   If `x` happens to be exactly between two values, then the lower index is returned.
 */
export function indexOfNearest (a, x) {
  var i = indicesOfNearest(a, x)
  var lo = i[0]
  var hi = i[1]
  if (Math.abs(x - a[lo]) <= Math.abs(x - a[hi])) {
    return lo
  } else {
    return hi
  }
}
