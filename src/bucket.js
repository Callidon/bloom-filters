/* file : bucket.js
MIT License

Copyright (c) 2017 Thomas Minier & Arnaud Grall

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

const eq = require('lodash.eq')
const utils = require('./utils.js')
const Exportable = require('./exportable.js')

/**
 * A Bucket is a container of a fixed number of values, used in various bloom filters.
 * @extends Exportable
 * @author Thomas Minier
 * @private
 */
class Bucket extends Exportable {
  /**
   * Constructor
   * @param {int} size - The number of element in the bucket
   */
  constructor (size) {
    super('Bucket', 'size', 'elements')
    this.elements = utils.allocateArray(size, null)
    this.size = size
    this.length = 0
  }

  /**
   * Create a new Bucket from a JSON export
   * @param  {Object} json - A JSON export of a Bucket
   * @return {Bucket} A new Bucket
   */
  static fromJSON (json) {
    if ((json.type !== 'Bucket') || !('size' in json) || !('elements' in json)) { throw new Error('Cannot create a Bucket from a JSON export which does not represent a bucket') }
    const bucket = new Bucket(json.size)
    json.elements.forEach((elt, i) => {
      if (elt !== null) {
        bucket.elements[i] = elt
        bucket.length++
      }
    })
    return bucket
  }

  /**
   * Indicates if the bucket has any space available
   * @return {boolean} True if te bucket has any space available, False if if its full
   */
  isFree () {
    return this.length < this.size
  }

  /**
   * Get the index of the first empty slot in the bucket
   * @return {int} The index of the first empty slot, or -1 if the bucket is full
   */
  nextEmptySlot () {
    return this.elements.indexOf(null)
  }

  /**
   * Get the element at the given index in the bucket
   * @param {int} index - The index to access
   * @return {*} The element at the given index
   */
  at (index) {
    return this.elements[index]
  }

  /**
   * Add an element to the bucket
   * @param {*} element - The element to add in the bucket
   * @return {boolean} True if the insertion is a success, False if the bucket is full
   */
  add (element) {
    if (!this.isFree()) return false
    this.set(this.nextEmptySlot(), element)
    this.length++
    return true
  }

  /**
   * Remove an element from the bucket
   * @param {*} element - The element to remove from the bucket
   * @return {boolean} True if the element has been successfully removed, False if it was not in the bucket
   */
  remove (element) {
    const index = this.elements.indexOf(element)
    if (index <= -1) return false
    this.unset(index)
    return true
  }

  /**
   * Test an element for membership
   * @param {*} element - The element to look for in the bucket
   * @return {boolean} True is the element is in the bucket, otherwise False
   */
  has (element) {
    return this.elements.indexOf(element) > -1
  }

  /**
   * Set an element at the given index in the bucket
   * @param  {int} index - The index at where the element should be inserted
   * @param  {*} element - The element to insert
   * @return {void}
   */
  set (index, element) {
    this.elements[index] = element
  }

  /**
   * Unset the element at the given index
   * @param  {int} index - The index of the element that should be unset
   * @return {void}
   */
  unset (index) {
    this.elements[index] = null
    this.length--
  }

  /**
   * Randomly swap an element of the bucket with a given element, then return the replaced element
   * @param {*} element - The element to be inserted
   * @return {*} The element that have been swapped with the parameter
   */
  swapRandom (element) {
    const index = utils.randomInt(0, this.length - 1)
    const tmp = this.elements[index]
    this.elements[index] = element
    return tmp
  }

  /**
   * Test if two buckets are equals, i.e. have the same size, length and content
   * @param  {Bucket} bucket - The other bucket with which to compare
   * @return {boolean} True if the two buckets are equals, False otherwise
   */
  equals (bucket) {
    if ((this.size !== bucket.size) || (this.length !== bucket.length)) return false
    return this.elements.every((elt, index) => eq(bucket.at(index), elt))
  }
}

module.exports = Bucket
