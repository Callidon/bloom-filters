import BloomFilter from 'bloom-filters/dist/mjs/bloom/bloom-filter.mjs'
console.log("Running: BloomFilter.from(['a']).has('a')");
console.log(BloomFilter.from(['a']).has('a'))