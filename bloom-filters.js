/* file : bloom-filters.js
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

// re-exports top-level classes to public API
const BloomFilter = require('./src/bloom-filter.js')
const PartitionedBloomFilter = require('./src/partitioned-bloom-filter.js')
const CuckooFilter = require('./src/cuckoo-filter.js')
const CountMinSketch = require('./src/count-min-sketch.js')
const InvertibleBloomFilter = require('./src/invertible-bloom-lookup-tables.js').InvertibleBloomFilter
const Utils = require('./src/utils')

module.exports = {
  BloomFilter,
  PartitionedBloomFilter,
  CuckooFilter,
  CountMinSketch,
  InvertibleBloomFilter,
  Utils
}
