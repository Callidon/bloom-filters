/* file : bucket.js
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

'use strict';

const utils = require('./utils.js');

/**
 * A Bucket is a container of a fixed number of values, used in various bloom filters.
 * @author Thomas Minier
 */
class Bucket {
	/**
	 * Constructor
	 * @param {int} size - The number of element in the bucket
	 */
	constructor (size) {
		this.elements = [];
		this.size = size;
		this.length = 0;
	}

	/**
	 * Indicates if the bucket has any space available
	 * @return {boolean} True if te bucket has any space available, False if if its full
	 */
	isFree () {
		return this.length < this.size;
	}

	/**
	 * Add an element to the bucket
	 * @param {*} element - The element to add in the bucket
	 * @return {boolean} True if the insertion is a success, False if the bucket is full
	 */
	add (element) {
		if (!this.isFree()) return false;
		this.elements.push(element);
		this.length++;
		return true;
	}

	/**
	 * Remove an element from the bucket
	 * @param {*} element - The element to remove from the bucket
	 * @return {boolean} True if the element has been successfully removed, False if it was not in the bucket
	 */
	remove (element) {
		const index = this.elements.indexOf(element);
		if (index <= -1) return false;
		this.elements.splice(index, 1);
		this.length--;
		return true;
	}

	/**
	 * Test an element for membership
	 * @param {*} element - The element to look for in the bucket
	 * @return {boolean} True is the element is in the bucket, otherwise False
	 */
	has (element) {
		return this.elements.indexOf(element) > -1;
	}

	/**
	 * Randomly swap an element of the bucket with a given element, then return the replaced element
	 * @param {*} element - The element to be inserted
	 * @return {*} The element that have been swapped with the parameter
	 */
	swapRandom (element) {
		const index = utils.randomInt(0, this.length - 1);
		const tmp = this.elements[index];
		this.elements[index] = element;
		return tmp;
	}
}

module.exports = Bucket;
