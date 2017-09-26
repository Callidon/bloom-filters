/* file : formulas.js
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

/**
 * Various formulas used with Bloom Filters
 * @namespace Formulas
 * @private
 */

 /**
 * Compute the optimal size of a Bloom Filter
 * @param  {int} setLength - The length of the dataset used to fill the filter
 * @param  {number} errorRate - The targeted false positive rate
 * @return {int} The optimal size of a Bloom Filter
 * @memberof Formulas
 */
const optimalFilterSize = (setLength, errorRate) => {
  return Math.ceil(-((setLength * Math.log(errorRate)) / Math.pow(Math.log(2), 2)))
}

/**
 * Compute the optimal number of hash functions to be used by a Bloom Filter
 * @param  {int} size - The size of the filter
 * @param  {int} setLength - The length of the dataset used to fill the filter
 * @return {int} The optimal number of hash functions to be used by a Bloom Filter
 * @memberof Formulas
 */
const optimalHashes = (size, setLength) => {
  return Math.ceil((size / setLength) * Math.log(2))
}

module.exports = {
  optimalFilterSize,
  optimalHashes
}
