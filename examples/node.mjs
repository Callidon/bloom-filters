import { BloomFilter } from '../dist/mjs/dist/browser.mjs'
import assert from 'assert'
assert(BloomFilter, 'BloomFilter should be defined')
let filter = new BloomFilter(10, 4)
filter.add('alice')
filter.add('bob')
console.log(filter.has('bob')) // output: true
console.log(filter.has('daniel')) // output: false
console.log(filter.rate())
const items = ['alice', 'bob']
const errorRate = 0.04 // 4 % error rate
filter = BloomFilter.create(items.length, errorRate)
filter = BloomFilter.from(items, errorRate)
BloomFilter.fromJSON(filter.saveAsJSON())