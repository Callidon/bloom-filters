# Bloom-Filters
[![Build Status](https://travis-ci.org/Callidon/bloom-filters.svg?branch=master)](https://travis-ci.org/Callidon/bloom-filters) [![codecov](https://codecov.io/gh/Callidon/bloom-filters/branch/master/graph/badge.svg)](https://codecov.io/gh/Callidon/bloom-filters)

**Keywords:** bloom, filter, bloom filter, probabilistic, datastructure

JS implementation of probabilistic data structures: Bloom Filter (and its derived), HyperLogLog, Count-Min Sketch, Top-K and MinHash

[Online documentation](https://callidon.github.io/bloom-filters/)

# Table of contents

* [Installation](#installation)
* [Data structures](#data-structures)
	* [Classic Bloom Filter](#classic-bloom-filter)
	* [Partitioned Bloom Filter](#partitioned-bloom-filter)
	* [Cuckoo Filter](#cuckoo-filter)
	* [Count Min Sketch](#count-min-sketch)
* [Documentation](#documentation)
* [Tests](#tests)
* [References](#references)
* [License](#license)

## Installation

```bash
  npm install bloom-filters --save
```

## Data structures


### Classic Bloom Filter

```javascript
const BloomFilter = require('bloom-filters').BloomFilter;

// create a Bloom Filter with size = 15 and 1% error rate
let filter = new BloomFilter(15, 0.01);

// alternatively, create a Bloom Filter from an array with 1% error rate
filter = BloomFilter.from([ 'alice', 'bob' ], 0.01);

// add some value in the filter
filter.add('alice');
filter.add('bob');

// lookup for some data
console.log(filter.has('bob')); // output: true
console.log(filter.has('daniel')); // output: false

// print false positive rate (around 0.01)
console.log(filter.rate());
```

### Partitioned Bloom Filter

Partitioned Bloom Filter follow the same API than [Classic Bloom Filter](#classic-bloom-filter).
```javascript
const PartitionedBloomFilter = require('bloom-filters').PartitionedBloomFilter;

// create a Partitioned Bloom Filter with size = 15 and 1% error rate
const filter = new PartitionedBloomFilter(15, 0.01);

// now use it like a classic bloom filter!
// ...
```

### Cuckoo Filter

```javascript
const CuckooFilter = require('bloom-filters').CuckooFilter;

// create a Cuckoo Filter with size = 15, fingerprint length = 3 and bucket size = 2
const filter = new CuckooFilter(15, 3, 2);
filter.add('alice');
filter.add('bob');

// lookup for some data
console.log(filter.has('bob')); // output: true
console.log(filter.has('daniel')); // output: false

// remove something
filter.remove('bob');
console.log(filter.has('bob')); // output: false
```

### Count Min Sketch

```javascript
const CountMinSketch = require('bloom-filters').CountMinSketch;

// create a new count min sketch with epsilon = 0.001 and delta = 0.99
const sketch = new CountMinSketch(0.001, 0.99);

// push some occurrences in the sketch
sketch.update('alice');
sketch.update('alice');
sketch.update('bob');

// count occurrences
console.log(sketch.count('alice')); // output: 2
console.log(sketch.count('bob')); // output: 1
console.log(sketch.count('daniel')); // output: 0
```

# Documentation

See [documentation online](https://callidon.github.io/bloom-filters/) or generate it in directory `doc/` with: `npm run doc`

## Tests

Running with Mocha + Chai
```bash
# run tests
npm test

# generate coverage with istanbul
npm run coverage
```

## References

* [Classic Bloom Filter](http://crystal.uta.edu/~mcguigan/cse6350/papers/Bloom.pdf): Bloom, B. H. (1970). Space/time trade-offs in hash coding with allowable errors. Communications of the ACM, 13(7), 422-426.
* [Partitioned Bloom Filter](https://pdfs.semanticscholar.org/0e18/e24b37a1f4196fddf8c9ff8e4368b74cfd88.pdf): Chang, F., Feng, W. C., & Li, K. (2004, March). Approximate caches for packet classification. In INFOCOM 2004. Twenty-third AnnualJoint Conference of the IEEE Computer and Communications Societies (Vol. 4, pp. 2196-2207). IEEE.
* [Cuckoo Filter](https://www.cs.cmu.edu/~dga/papers/cuckoo-conext2014.pdf): Fan, B., Andersen, D. G., Kaminsky, M., & Mitzenmacher, M. D. (2014, December). Cuckoo filter: Practically better than bloom. In Proceedings of the 10th ACM International on Conference on emerging Networking Experiments and Technologies (pp. 75-88). ACM.
* [Count Min Sketch](http://vaffanculo.twiki.di.uniroma1.it/pub/Ing_algo/WebHome/p14_Cormode_JAl_05.pdf): Cormode, G., & Muthukrishnan, S. (2005). An improved data stream summary: the count-min sketch and its applications. Journal of Algorithms, 55(1), 58-75.

## License
[MIT License](https://github.com/Callidon/bloom-filters/blob/master/LICENSE)
