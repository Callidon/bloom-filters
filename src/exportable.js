/* file : exportable.js
MIT License

Copyright (c) 2016 Thomas Minier & Arnaud Grall

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use strict'

/**
 * An Exportable is a class that can be exported into a JSON object
 * @abstract
 * @author Thomas Minier
 */
class Exportable {
  /**
   * Constructor
   * @param  {string} type  - The type of this exportable
   * @param  {string[]} fields - The fields to exports as JSON
   */
  constructor (type, ...fields) {
    this.type = type
    this.fields = fields
    this.resolvers = new Map()
    this.resolvers.set('_default', v => {
      if (Array.isArray(v)) {
        return v.slice(0)
      } else if (typeof v === 'object') {
        return Object.assign({}, v)
      }
      return v
    })
  }

  /**
   * Register a resolver used to resolve the export of a field
   * @param  {string} field    - The name of the field associated to this resolver
   * @param  {function} resolver - The resolver used to export the field
   * @return {void}
   * @private
   */
  _registerResolver (field, resolver) {
    this.resolvers.set(field, resolver)
  }

  /**
   * Save as a JSON object
   * @return {Object} The exported JSON object
   */
  saveAsJSON () {
    let value
    const json = { type: this.type }
    this.fields.forEach(fieldName => {
      if (fieldName in this) {
        value = this[fieldName]
        if (this.resolvers.has(fieldName)) {
          json[fieldName] = this.resolvers.get(fieldName)(value)
        } else {
          json[fieldName] = this.resolvers.get('_default')(value)
        }
      }
    })
    return json
  }
}

module.exports = Exportable
