/* file : export-import-specs.js
MIT License

Copyright (c) 2017-2018 Thomas Minier & Arnaud Grall

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
 * Clone a field of a filter (array, object or any primary type)
 * @param  {*} v - Value to clone
 * @return {*} Cloned value
 */
function cloneField (v) {
  if (v === null || v === undefined) {
    return v
  } if (Array.isArray(v)) {
    return v.map(cloneField)
  } else if (typeof v === 'object') {
    if ('saveAsJSON' in v) {
      return v.saveAsJSON()
    }
    return Object.assign({}, v)
  }
  return v
}

function cloneObject (type, ...fields) {
  return function (obj) {
    const json = { type }
    fields.forEach(field => {
      json[field] = cloneField(obj[field])
    })
    return json
  }
}

function assertFields (obj, ...fields) {
  return fields.every(field => field in obj)
}

const BloomFilterSpecs = {
  export: cloneObject('BloomFilter', '_capacity', '_errorRate', '_size', '_length', '_nbHashes', '_filter'),
  import: (FilterConstructor, json) => {
    if ((json.type !== 'BloomFilter') || !assertFields(json, '_capacity', '_errorRate', '_size', '_length', '_nbHashes', '_filter')) {
      throw new Error('Cannot create a BloomFilter from a JSON export which does not represent a bloom filter')
    }
    const filter = new FilterConstructor(json._capacity, json._errorRate)
    filter._size = json._size
    filter._nbHashes = json._nbHashes
    filter._filter = json._filter.slice(0)
    filter._length = json._length
    return filter
  }
}

const BucketSpecs = {
  export: cloneObject('Bucket', '_size', '_elements'),
  import: (FilterConstructor, json) => {
    if ((json.type !== 'Bucket') || !assertFields(json, '_size', '_elements')) {
      throw new Error('Cannot create a Bucket from a JSON export which does not represent a bucket')
    }
    const bucket = new FilterConstructor(json._size)
    json._elements.forEach((elt, i) => {
      if (elt !== null) {
        bucket._elements[i] = elt
        bucket._length++
      }
    })
    return bucket
  }
}

const CountMinSketchSpecs = {
  export: cloneObject('CountMinSketch', '_epsilon', '_delta', '_matrix'),
  import: (FilterConstructor, json) => {
    if ((json.type !== 'CountMinSketch') || !assertFields(json, '_epsilon', '_delta', '_matrix')) {
      throw new Error('Cannot create a CountMinSketch from a JSON export which does not represent a count-min sketch')
    }
    const sketch = new FilterConstructor(json._epsilon, json._delta)
    sketch._matrix = json._matrix.slice()
    return sketch
  }
}

const CuckooFilterSpecs = {
  export: cloneObject('CuckooFilter', '_size', '_fingerprintLength', '_length', '_maxKicks', '_filter')
}

const PartitionedBloomFilterSpecs = {
  export: cloneObject('PartitionedBloomFilter', '_capacity', '_errorRate', '_length', '_filter'),
  import: (FilterConstructor, json) => {
    if ((json.type !== 'PartitionedBloomFilter') || !assertFields(json, '_capacity', '_errorRate', '_length', '_filter')) {
      throw new Error('Cannot create a PartitionedBloomFilter from a JSON export which does not represent a Partitioned Bloom Filter')
    }
    const filter = new FilterConstructor(json._capacity, json._errorRate)
    filter._length = json._length
    filter._filter = json._filter.slice()
    return filter
  }
}

module.exports = {
  'BloomFilter': BloomFilterSpecs,
  'Bucket': BucketSpecs,
  'CountMinSketch': CountMinSketchSpecs,
  'CuckooFilter': CuckooFilterSpecs,
  'PartitionedBloomFilter': PartitionedBloomFilterSpecs
}
