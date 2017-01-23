/* file : utils.js
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

// JSDOC typedef
/**
 * @typedef {TwoHashes} Two hashes of the same value, as computed by {@link hashTwice}.
 * @property {number} first - The result of the first hashing function applied to a value
 * @property {number} second - The result of the second hashing function applied to a value
 */

/**
 * Create a new array fill with a base value
 * @param  {int} size - The size of the array
 * @param  {*} defaultValue - The default value used to fill the array
 * @return {Array} A newly allocated array
 */
const allocateArray = (size, defaultValue) => {
	const array = new Array(size);
	for(let ind = 0; ind < size; ind++) {
		array[ind] = defaultValue;
	}
	return array;
};

/**
 * Hash a value using two hash functions
 * @param  {function} hashA - The first hash function
 * @param  {function} hashB - The second hash function
 * @param  {*} value - The value to hash
 * @return {TwoHashes} The results of the hash functions applied to the value
 */
const hashTwice = (hashA, hashB, value) => {
	return {
		first: hashA(value),
		second: hashB(value)
	};
};

/**
 * Apply Double Hashing to produce a n-hash
 * 
 * This implementation used directly the value produced by the two hash functions instead of the functions themselves.
 * @see {@link http://citeseer.ist.psu.edu/viewdoc/download;jsessionid=4060353E67A356EF9528D2C57C064F5A?doi=10.1.1.152.579&rep=rep1&type=pdf} for more details about double hashing.
 * @param  {int} n - The indice of the hash function we want to produce
 * @param  {int} hashA - The result of the first hash function applied to a value.
 * @param  {int} hashB - The result of the second hash function applied to a value.
 * @param  {int} size - The size of the datastructures associated to the hash context (ex: the size of a Bloom Filter)
 * @return {int} - The result of hash_n applied to a value.
 */
const doubleHashing = (n, hashA, hashB, size) => {
	return (hashA + n * hashB) % size;
};

module.exports = {
	allocateArray,
	hashTwice,
	doubleHashing
};
