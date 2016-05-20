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
