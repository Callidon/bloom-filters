const { InvertibleBloomFilter } = require('../bloom-filters')
// const Buffer = require('buffer').Buffer
// or
const Buffer = require('buffer/').Buffer
// create a new Invertible Bloom Filters with 1000 cells and 4 hash functions
const iblt = new InvertibleBloomFilter(1000, 4)
const remote = new InvertibleBloomFilter(1000, 4)
// push some data in the iblt
const data = [Buffer.from('alice'),
  Buffer.from(JSON.stringify(42)),
  Buffer.from('help'),
  Buffer.from('meow'),
  Buffer.from('json')]

data.forEach(e => iblt.add(e))

const remoteData = [Buffer.from('alice'),
  Buffer.from('car'),
  Buffer.from('meow'),
  Buffer.from('help')]

remoteData.forEach(e => remote.add(e))

const sub = iblt.substract(remote)
const result = InvertibleBloomFilter.decode(sub)
console.log('Did we successfully decode the substracted iblts?', result.success)
console.log('Missing elements for iblt: ', result.missing, result.missing.map(e => e.toString()))
console.log('Additional elements of iblt and missing elements of the remote iblt: ', result.additional, result.additional.map(e => e.toString()))
