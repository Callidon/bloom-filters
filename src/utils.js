/* file : utils.js
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

const murmur = require('murmurhash3js')

/**
 * Utilitaries functions
 * @namespace Utils
 * @private
 */

/* JSDOC typedef */
/**
 * @typedef {TwoHashes} Two hashes of the same value, as computed by {@link hashTwice}.
 * @property {number} first - The result of the first hashing function applied to a value
 * @property {number} second - The result of the second hashing function applied to a value
 * @memberof Utils
 */

/**
 * Create a new array fill with a base value
 * @param  {int} size - The size of the array
 * @param  {*} defaultValue - The default value used to fill the array. If it's a function, it will be invoked to get the default value.
 * @return {Array} A newly allocated array
 * @memberof Utils
 */
const allocateArray = (size, defaultValue) => {
  const array = new Array(size)
  const getDefault = (typeof defaultValue !== 'function') ? () => defaultValue : defaultValue
  for (let ind = 0; ind < size; ind++) {
    array[ind] = getDefault()
  }
  return array
}

/**
 * Hash a value into two values (in hex or integer format)
 *
 * Use MumurmurHash3 as the default hashing function, but another function can be easily used.
 * @see {@link https://en.wikipedia.org/wiki/MurmurHash} for more details about MurmurHash3
 * @param  {*} value - The value to hash
 * @param  {boolean} [asInt=false] - (optional) If True, the values will be returned as an integer. Otherwise, as hexadecimal values.
 * @param  {function} [hashFunction=null] - (optional) The hash function used. It should return a 128-bits long hash. By default, MumurmurHash3 is used.
 * @return {TwoHashes} The results of the hash functions applied to the value (in hex or integer)
 * @memberof Utils
 */
const hashTwice = (value, asInt = false, hashFunction = null) => {
  const hex = (hashFunction !== null) ? hashFunction(value) : murmur.x64.hash128(value)
  const firstHash = hex.substring(0, 16)
  const secondHash = hex.substring(16)
  if (asInt) {
    return {
      first: parseInt(firstHash, 16),
      second: parseInt(secondHash, 16)
    }
  }
  return {
    first: firstHash,
    second: secondHash
  }
}

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
 * @memberof Utils
 */
const doubleHashing = (n, hashA, hashB, size) => {
  return Math.abs(hashA + n * hashB) % size
}

/**
 * Generate a random int bewteen two bounds (included)
 * @param {int} min - The lower bound
 * @param {int} max - The upper bound
 * @return {int} A random int bewteen lower and upper bound (included)
 * @memberof Utils
 */
const randomInt = (min, max) => {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

module.exports = {
  allocateArray,
  hashTwice,
  doubleHashing,
  randomInt
}
