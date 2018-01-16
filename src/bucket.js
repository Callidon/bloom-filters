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
const indexOf = require('lodash.indexof')
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
   * @param {int} size - The maximum number of elements in the bucket
   */
  constructor (size) {
    super()
    this._elements = utils.allocateArray(size, null)
    this._size = size
    this._firstNullIndex = 0
    this._length = 0
  }

  /**
   * Get the maximum number of element in the bucket
   * @return {integer} The maximum number of elements in the bucket
   */
  get size () {
    return this._size
  }

  /**
   * Get the number of elements currenlty in the bucket
   * @return {integer} The number of elements currenlty in the bucket
   */
  get length () {
    return this._length
  }

  /**
   * Indicates if the bucket has any space available
   * @return {boolean} True if te bucket has any space available, False if if its full
   */
  isFree () {
    return this._length < this._size
  }

  /**
   * Get the index of the first empty slot in the bucket
   * @return {int} The index of the first empty slot, or -1 if the bucket is full
   */
  nextEmptySlot () {
    return indexOf(this._elements, null)
  }

  /**
   * Get the element at the given index in the bucket
   * @param {int} index - The index to access
   * @return {*} The element at the given index
   */
  at (index) {
    return this._elements[index]
  }

  /**
   * Add an element to the bucket
   * @param {*} element - The element to add in the bucket
   * @return {boolean} True if the insertion is a success, False if the bucket is full
   */
  add (element) {
    if (!this.isFree()) return false
    this.set(this.nextEmptySlot(), element)
    this._length++
    return true
  }

  /**
   * Remove an element from the bucket
   * @param {*} element - The element to remove from the bucket
   * @return {boolean} True if the element has been successfully removed, False if it was not in the bucket
   */
  remove (element) {
    const index = indexOf(this._elements, element)
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
    return indexOf(this._elements, element) > -1
  }

  /**
   * Set an element at the given index in the bucket
   * @param  {int} index - The index at where the element should be inserted
   * @param  {*} element - The element to insert
   * @return {void}
   */
  set (index, element) {
    this._elements[index] = element
  }

  /**
   * Unset the element at the given index
   * @param  {int} index - The index of the element that should be unset
   * @return {void}
   */
  unset (index) {
    this._elements[index] = null
    this._length--
  }

  /**
   * Randomly swap an element of the bucket with a given element, then return the replaced element
   * @param {*} element - The element to be inserted
   * @return {*} The element that have been swapped with the parameter
   */
  swapRandom (element) {
    const index = utils.randomInt(0, this._length - 1)
    const tmp = this._elements[index]
    this._elements[index] = element
    return tmp
  }

  /**
   * Test if two buckets are equals, i.e. have the same size, length and content
   * @param  {Bucket} bucket - The other bucket with which to compare
   * @return {boolean} True if the two buckets are equals, False otherwise
   */
  equals (bucket) {
    if ((this._size !== bucket.size) || (this._length !== bucket.length)) return false
    return this._elements.every((elt, index) => eq(bucket.at(index), elt))
  }
}

module.exports = Bucket
