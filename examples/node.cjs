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