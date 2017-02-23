# Bloom-Filters
[![Build Status](https://travis-ci.org/Callidon/bloom-filters.svg?branch=master)](https://travis-ci.org/Callidon/bloom-filters) [![Coverage Status](https://coveralls.io/repos/github/Callidon/bloom-filters/badge.svg?branch=master)](https://coveralls.io/github/Callidon/bloom-filters?branch=master)

**Keywords:** bloom, filter, bloom filter, probabilistic, datastructure

JS implementation of probabilistic data structures: Bloom Filter (and its derived), HyperLogLog, Count-Min Sketch, Top-K and MinHash

# Table of contents

* [Installation](#installation)
* [Data structures](#data-structures)
	* [Classic Bloom Filter](#classic-bloom-filter)
	* [Cuckoo Filter](#cuckoo-filter)
	* [Count Min Sketch](#count-min-sketch)
* [Tests](#tests)
* [Documentation](#documentation)
* [References](#references)
* [License](#license)

## Installation

```bash
  npm install bloom-filters
```

## Data structures

### Classic Bloom Filter

```javascript
const BloomFilter = require('bloom-filters').BloomFilter;

// create a Bloom Filter with size = 15 and 2 hash functions
let filter = new BloomFilter(15, 2);
filter.add('alice');
filter.add('bob');

// create a Bloom Filter from an array with a 1% error rate
filter = BloomFilter.from([ 'alice', 'bob' ], 0.1);

// lookup for some data
console.log(filter.has('bob')); // output: true
console.log(filter.has('daniel')); // output: false

// print false positive rate (around 0.1)
console.log(filter.rate());
```

## Cuckoo Filter

```javascript
const CuckooFilter = require('bloom-filters').CuckooFilter;

// create a Cuckoo Filter with size = 15, fingerprint length = 3 and bucket size = 2
let filter = new CuckooFilter(15, 3, 2);
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

// creates a new count min sketch with epsilon = 0.001 and delta = 0.99
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

## Tests

Running with Mocha + Chai
```bash
# run tests
npm test

# generate coverage with istanbul
npm run coverage
```

# Documentation
Generate JSDoc in directory `doc/`
```
npm run doc
```
## References

* [Classic Bloom Filter](http://crystal.uta.edu/~mcguigan/cse6350/papers/Bloom.pdf): Bloom, B. H. (1970). Space/time trade-offs in hash coding with allowable errors. Communications of the ACM, 13(7), 422-426.
* [Cuckoo Filter](https://www.cs.cmu.edu/~dga/papers/cuckoo-conext2014.pdf): Fan, B., Andersen, D. G., Kaminsky, M., & Mitzenmacher, M. D. (2014, December). Cuckoo filter: Practically better than bloom. In Proceedings of the 10th ACM International on Conference on emerging Networking Experiments and Technologies (pp. 75-88). ACM.
* [Count Min Sketch](https://www.usenix.org/legacy/events/hotsec10/tech/full_papers/Schechter.pdf): Schechter, S., Herley, C., & Mitzenmacher, M. (2010, August). Popularity is everything: A new approach to protecting passwords from statistical-guessing attacks. In Proceedings of the 5th USENIX conference on Hot topics in security (pp. 1-8). USENIX Association.

## License
[MIT License](https://github.com/Callidon/bloom-filters/blob/master/LICENSE)
