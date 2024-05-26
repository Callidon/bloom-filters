const bfs = require('../dist/commonjs')
const assert = require('assert')
assert(bfs.BloomFilter, 'BloomFilter should be defined')
let filter = new bfs.BloomFilter(10, 4)
filter.add('alice')
filter.add('bob')
filter.has('bob') // output: true
filter.has('daniel') // output: false
filter.rate()
const items = ['alice', 'bob']
const errorRate = 0.04 // 4 % error rate
filter = bfs.BloomFilter.create(items.length, errorRate)
filter = bfs.BloomFilter.from(items, errorRate)
bfs.BloomFilter.fromJSON(filter.saveAsJSON())

bfs.Hashing.lib = {
    xxh64: (x, _) => 1n,
    xxh128: (x, _) => 1n,
}
filter._hashing._lib = bfs.Hashing.lib
const hashes = filter._hashing.hashTwice('x')
assert(hashes.first === 1n)
assert(hashes.second === 1n)