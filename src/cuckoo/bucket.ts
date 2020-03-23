/* file : bucket.ts
MIT License

Copyright (c) 2017-2020 Thomas Minier & Arnaud Grall

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

import eq from 'lodash.eq'
import indexOf from 'lodash.indexof'
import * as utils from '../utils'
import { Exportable } from '../exportable'
import { cloneObject } from '../exportable'

/**
 * A Bucket is a container of a fixed number of values, used in various bloom filters.
 * @extends Exportable
 * @author Thomas Minier
 * @private
 */
@Exportable({
  export: cloneObject('Bucket', '_size', '_elements'),
  import: (json: any) => {
    if ((json.type !== 'Bucket') || !('_size' in json), !('_elements' in json)) {
      throw new Error('Cannot create a Bucket from a JSON export which does not represent a bucket')
    }
    const bucket = new Bucket(json._size)
    json._elements.forEach((elt: any, i: number) => {
      if (elt !== null) {
        bucket._elements[i] = elt
        bucket._length++
      }
    })
    return bucket
  }
})
export default class Bucket<T> {
  public _elements: Array<T | null>
  private _size: number
  public _length: number

  /**
   * Constructor
   * @param size - The maximum number of elements in the bucket
   */
  constructor (size: number) {
    this._elements = utils.allocateArray(size, null)
    this._size = size
    this._length = 0
  }

  /**
   * Get the maximum number of element in the bucket
   */
  get size (): number {
    return this._size
  }

  /**
   * Get the number of elements currenlty in the bucket
   */
  get length (): number {
    return this._length
  }

  /**
   * Test if the bucket has any space available
   * @return True if te bucket has any space available, False if if its full
   */
  isFree (): boolean {
    return this._length < this._size
  }

  /**
   * Get the index of the first empty slot in the bucket
   * @return The index of the first empty slot, or -1 if the bucket is full
   */
  nextEmptySlot (): number {
    return indexOf(this._elements, null)
  }

  /**
   * Get the element at the given index in the bucket
   * @param index - The index to access
   * @return The element at the given index
   */
  at (index: number): T | null {
    return this._elements[index]
  }

  /**
   * Try to add an element to the bucket
   * @param element - The element to add in the bucket
   * @return True if the insertion is a success, False if the bucket is full
   */
  add (element: T | null): boolean {
    if (element === null || !this.isFree()) {
      return false
    }
    this.set(this.nextEmptySlot(), element)
    this._length++
    return true
  }

  /**
   * Try to remove an element from the bucket
   * @param element - The element to remove from the bucket
   * @return True if the element has been successfully removed, False if it was not in the bucket
   */
  remove (element: T): boolean {
    const index = indexOf(this._elements, element)
    if (index <= -1) {
      return false
    } 
    this.unset(index)
    return true
  }

  /**
   * Test an element for membership
   * @param element - The element to look for in the bucket
   * @return True is the element is in the bucket, otherwise False
   */
  has (element: T): boolean {
    return indexOf(this._elements, element) > -1
  }

  /**
   * Set an element at the given index in the bucket
   * @param index - The index at where the element should be inserted
   * @param element - The element to insert
   */
  set (index: number, element: T | null): void {
    this._elements[index] = element
  }

  /**
   * Unset the element at the given index
   * @param index - The index of the element that should be unset
   */
  unset (index: number): void {
    this._elements[index] = null
    this._length--
  }

  /**
   * Randomly swap an element of the bucket with a given element, then return the replaced element
   * @param element - The element to be inserted
   * @param random - Factory function used to generate random function
   * @return The element that have been swapped with the parameter
   */
  swapRandom (element: T, random: () => number = Math.random): T | null {
    const index = utils.randomInt(0, this._length - 1, random)
    const tmp = this._elements[index]
    this._elements[index] = element
    return tmp
  }

  /**
   * Swap an element of the bucket with a given index and element, then return the replaced element
   * @param index - The index at where the element should be inserted
   * @param element - The element to be inserted
   * @return The element that have been swapped with the parameter
   */
  swap (index: number, element: T): T | null {
    const tmp = this._elements[index]
    this._elements[index] = element
    return tmp
  }

  /**
   * Test if two buckets are equals: they have the same size, length and content
   * @param bucket - The other bucket with which to compare
   * @return True if the two buckets are equals, False otherwise
   */
  equals (bucket: Bucket<T>): boolean {
    if ((this._size !== bucket.size) || (this._length !== bucket.length)) return false
    return this._elements.every((elt, index) => eq(bucket.at(index), elt))
  }
}
