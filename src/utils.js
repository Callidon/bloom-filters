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

const XXH = require('xxhashjs')

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
 * (64-bits only) Hash a value into two values (in hex or integer format)
 * @param  {string|ArrayBuffer|Buffer} value - The value to hash
 * @param  {boolean} [asInt=false] - (optional) If True, the values will be returned as an integer. Otherwise, as hexadecimal values.
 * @param {Number} seed the seed used for hashing
 * @return {TwoHashes} The results of the hash functions applied to the value (in hex or integer)
 * @memberof Utils
 * @author Arnaud Grall & Thomas Minier
 */
const hashTwice = (value, asInt = false, seed = getDefaultSeed()) => {
  const f = XXH.h64(value, seed + 1)
  const l = XXH.h64(value, seed + 2)
  if (asInt) {
    return {
      first: f.toNumber(),
      second: l.toNumber()
    }
  } else {
    let one = f.toString(16)
    if (one.length < 16) one = '0'.repeat(16 - one.length) + one
    let two = l.toString(16)
    if (two.length < 16) two = '0'.repeat(16 - two.length) + two
    return {
      first: one,
      second: two
    }
  }
}

/**
 * (64-bits only) Same as hashTwice but return Numbers and String equivalent
 * @param  {string|ArrayBuffer|Buffer} val the value to hash
 * @param  {Number} seed the seed to change when hashing
 * @return {Object} {int: {first: <number>, second: <number>}, string: {first: <hex-string>, second: <hex-string>}
 * @author Arnaud Grall
 */
const allInOneHashTwice = (val, seed = getDefaultSeed()) => {
  const one = XXH.h64(val, seed + 1)
  const two = XXH.h64(val, seed + 2)
  let stringOne = one.toString(16)
  if (stringOne.length < 16) stringOne = '0'.repeat(16 - stringOne.length) + stringOne
  let stringTwo = two.toString(16)
  if (stringTwo.length < 16) stringTwo = '0'.repeat(16 - stringTwo.length) + stringTwo

  return {
    int: {
      first: one.toNumber(),
      second: two.toNumber()
    },
    string: {
      first: stringOne,
      second: stringTwo
    }
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
 * @author Thomas Minier
 */
const doubleHashing = (n, hashA, hashB, size) => {
  return Math.abs((hashA + n * hashB) % size)
}

/**
 * Generate x distinct indexes on [0, size) using the double hashing technique
 * @param  {*} element   The element to hash
 * @param  {Number} size      the range on which we can generate an index [0, size) = size
 * @param  {Number} number The number of indexes desired
 * @param  {Number} seed the seed used
 * @return {Number[]}           index among [0, size)
 * @author Arnaud Grall
 */
const getDistinctIndices = (element, size, number, seed = getDefaultSeed()) => {
  const getDistinctIndicesBis = (n, elem, size, count, indexes = []) => {
    if (indexes.length === count) {
      return indexes
    } else {
      const hashes = hashTwice(elem, true, seed + size % n)
      const ind = doubleHashing(n, hashes.first, hashes.second, size)
      if (indexes.includes(ind)) {
        // console.log('generate index: %d for %s', ind, elem)
        return getDistinctIndicesBis(n + 1, elem, size, count, indexes)
      } else {
        // console.log('already found: %d for %s', ind, elem)
        indexes.push(ind)
        return getDistinctIndicesBis(n + 1, elem, size, count, indexes)
      }
    }
  }
  return getDistinctIndicesBis(1, element, size, number)
}

/**
 * generate hashCount indexes, one index per [0, size)
 * it uses the double hashing technique to generate the indexes
 * @param  {*} element   the element
 * @param  {Number} size      the range on which we can g-enerate the index, exclusive
 * @param  {Number} hashCount the number of indexes we want
 * @return {Number[]} an array of indexes
 */
const getIndices = (element, size, hashCount, seed = getDefaultSeed()) => {
  const arr = []
  for (let i = 1; i <= hashCount; i++) {
    const hashes = hashTwice(element, true, seed + size % i)
    arr.push(doubleHashing(i, hashes.first, hashes.second, size))
  }
  if (arr.length !== hashCount) throw new Error('report this, please, shouldnt be of different size')
  return arr
}

/**
 * Generate a random int bewteen two bounds (included)
 * @param {int} min - The lower bound
 * @param {int} max - The upper bound
 * @return {int} A random int bewteen lower and upper bound (included)
 * @memberof Utils
 * @author Thomas Minier
 */
const randomInt = (min, max, random = Math.random) => {
  min = Math.ceil(min)
  max = Math.floor(max)
  const rn = random()
  return Math.floor(rn * (max - min + 1)) + min
}

/**
 * Return the non-destructive XOR of 2 buffers
 * @param  {Buffer} a                          the buffer to copy, then to xor with b
 * @param  {Buffer} b                          the buffer to xor with
 * @param  {Object} [options={}]               options to pass to the new buffer
 * @return {Buffer} the xor between both buffer a and b
 * @author Arnaud Grall
 */
function xorBuffer (a, b, options = {}, val = true) {
  const length = Math.max(a.length, b.length)
  const buffer = Buffer.allocUnsafe(length).fill(0)
  for (let i = 0; i < length; ++i) {
    if (i < a.length && i < b.length) {
      buffer[length - i - 1] = a[a.length - i - 1] ^ b[b.length - i - 1]
    } else if (i < a.length && i >= b.length) {
      buffer[length - i - 1] ^= a[a.length - i - 1]
    } else if (i < b.length && i >= a.length) {
      buffer[length - i - 1] ^= b[b.length - i - 1]
    }
  }
  // now need to remove leading zeroes in the buffer if any
  let start = 0
  const it = buffer.values()
  let value = it.next()
  while (!value.done && value.value === 0) {
    start++
    value = it.next()
  }
  const buf2 = buffer.slice(start)
  return buf2
}

/**
 * Return true if the buffer isEmpty, aka all value are equals to 0.
 * @param  {Buffer}  buffer the buffer to inspect
 * @return {Boolean}        true if empty or null or undefined, false otherwise
 * @author Arnaud Grall
 */
function isEmptyBuffer (buffer) {
  if (buffer === null || !buffer) return true
  const json = buffer.toJSON()
  let i = 0
  let found = false
  while (!found && i < json.data.length) {
    if (json.data[i] !== 0) {
      found = true
    }
    i++
  }
  return !found
}

/**
 * Return a hash as un unsigned int
 * @param  {string|ArrayBuffer|Buffer} elem        [description]
 * @param  {Number|UINT32|UINT64} [seed=getDefaultSeed()] If the seed is UINT32 make sure to set the length to 32
 * @param  {Number} [length=64] the version used 32 or 64, default: 64
 * @return {Number}  the hash as unsigned int
 * @author Arnaud Grall
 */
function hashAsInt (elem, seed = getDefaultSeed(), length = 64) {
  switch (length) {
    case 32:
      return XXH.h32(elem, seed).toNumber()
    case 64:
      return XXH.h64(elem, seed).toNumber()
    default:
      return XXH.h64(elem, seed).toNumber()
  }
}

/**
 * Return a hash as a string
 * @param  {string|ArrayBuffer|Buffer} elem        [description]
 * @param  {Number|UINT32|UINT64} [seed=getDefaultSeed()] If the seed is UINT32 make sure to set the length to 32
 * @param  {Number} [base=16]   the base in which the string will be returned, default: 16
 * @param  {Number} [length=64] the version used 32 or 64, default: 64
 * @return {string} the hash as string
 * @author Arnaud Grall
 */
function hashAsString (elem, seed = getDefaultSeed(), base = 16, length = 64) {
  let hash
  switch (length) {
    case 32:
      hash = XXH.h32(elem, seed)
      break
    case 64:
      hash = XXH.h64(elem, seed)
      break
    default:
      hash = XXH.h64(elem, seed)
      break
  }
  let string
  if (base === 16) {
    string = hash.toString(base)
    if (string.length < (length / 4)) {
      string = '0'.repeat((length / 4) - string.length) + string
    }
  } else if (base === 2) {
    string = hex2bin(hash.toString(16))
    if (string.length < length) {
      string = '0'.repeat(length - string.length) + string
    }
  }
  return hash
}

/**
 * Return a hash as an unsigned int and as string
 * @param  {string|ArrayBuffer|Buffer} elem        [description]
 * @param  {Number|UINT32|UINT64} [seed=getDefaultSeed()] If the seed is UINT32 make sure to set the length to 32
 * @param  {Number} [base=16]   the base in which the string will be returned, default: 16
 * @param  {Number} [length=64] the version used 32 or 64, default: 64
 * @return {Object}             A hash with its number and string version
 * @author Arnaud Grall
 */
function hashIntAndString (elem, seed = getDefaultSeed(), base = 16, length = 64) {
  let hash
  switch (length) {
    case 32:
      hash = XXH.h32(elem, seed)
      break
    case 64:
      hash = XXH.h64(elem, seed)
      break
    default:
      hash = XXH.h64(elem, seed)
      break
  }
  let string
  if (base === 16) {
    string = hash.toString(base)
    if (string.length < (length / 4)) {
      string = '0'.repeat((length / 4) - string.length) + string
    }
  } else if (base === 2) {
    string = hex2bin(hash.toString(16))
    if (string.length < length) {
      string = '0'.repeat(length - string.length) + string
    }
  }
  return { int: hash.toNumber(), string }
}

/**
 * Return the seed used in the package by default
 * @return {Number}
 * @author Arnaud Grall
 */
function getDefaultSeed () {
  return 0x1234567890
}

/**
 * Return the next power of 2 of x
 * @param  {Number} x Number
 * @return {Number} the next power of 2 of x
 */
function power2 (x) {
  return Math.ceil(Math.pow(2, Math.floor(Math.log(x) / Math.log(2))))
}

/**
 * Convert an hex string into binary
 * @param  {string} hex base 16 string
 * @return {string}     base 2 string
 */
function hex2bin (hex) {
  return parseInt(hex, 16).toString(2)
}

module.exports = {
  power2,
  getDefaultSeed,
  hashAsInt,
  hashAsString,
  hashIntAndString,
  getIndices,
  getDistinctIndices,
  allInOneHashTwice,
  isEmptyBuffer,
  xorBuffer,
  allocateArray,
  hashTwice,
  doubleHashing,
  randomInt
}
