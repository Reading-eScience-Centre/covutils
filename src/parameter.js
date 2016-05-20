/**
 * Returns the category of the given parameter corresponding to the encoded integer value.
 * 
 * @param {Parameter} parameter
 * @param {number} val
 * @return {Category}
 */
export function getCategory (parameter, val) {
  for (let [catId,vals] of parameter.categoryEncoding) {
    if (vals.indexOf(val) !== -1) {
      let cat = parameter.observedProperty.categories.filter(c => c.id === catId)[0]
      return cat
    }
  }
}