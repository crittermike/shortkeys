/**
 * Converts and removes keys with a
 * browser prefix to the key without prefix
 *
 * Example:
 *
 *    __chrome__keyName
 *    __firefox__keyName
 *    __opera__keyName
 *    __edge__keyName
 *
 * to `keyName`.
 * This way we can write one manifest thats valid
 * for all browsers
 *
 * @param  {Object} manifest
 * @return {Object}
 */
export default function applyBrowserPrefixesFor (_vendor) {
  vendor = _vendor
  return iterator
};

/**
 * Vendor key
 * @type {String}
 */
var vendor = ''

/**
 * Recursive iterator over all object keys
 * @param  {Object} obj    Object to iterate over
 * @return {Object}        Processed object
 */
function iterator (obj) {
  Object.keys(obj).forEach((key) => {
    let match = key.match(/^__(chrome|firefox|opera|edge)__(.*)/)
    if (match) {
        // Swap key with non prefixed name
      if (match[1] === vendor) {
        obj[match[2]] = obj[key]
      }

        // Remove the prefixed key
        // so it won't cause warings
      delete obj[key]
    } else {    // no match? try deeper
        // Recurse over object's inner keys
      if (typeof (obj[key]) === 'object') iterator(obj[key])
    }
  })
  return obj
}
