const { InvertibleBloomFilter } = require('../dist/api.js')
// the buffer package is auto imported by nodejs
// create a new Invertible Bloom Filters with 1000 cells and 4 hash functions
const hashcount = 3
const size = 50
const iblt = new InvertibleBloomFilter(size, hashcount)
const remote = new InvertibleBloomFilter(size, hashcount)

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
console.log('Did we successfully decode the substracted iblts?', result.success, result.reason)
console.log('Missing elements for iblt: ', result.missing, result.missing.map(e => e.toString()))
console.log('Additional elements of iblt and missing elements of the remote iblt: ', result.additional, result.additional.map(e => e.toString()))
// create the iblt like before
console.log('Verify if Buffer.from("help") is in the iblt: ', iblt.has(Buffer.from('help')))
// true with high probability if well configured

iblt.delete(Buffer.from('help'))
// no error ;)

console.log('Deleting Buffer.from("help") and rechecking:', iblt.has(Buffer.from('help')))

const list = iblt.listEntries()
console.log('Remaining entries after deletion: ', list.success, list.output.map(e => e.toString()))
