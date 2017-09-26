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
* [Export and import](#export-and-import)
* [Documentation](#documentation)
* [Tests](#tests)
* [References](#references)
* [License](#license)

## Installation

```bash
  npm install bloom-filters --save
```

## Data structures

### Classic Bloom Filter

A Bloom filter is a space-efficient probabilistic data structure, conceived by Burton Howard Bloom in 1970,
that is used to test whether an element is a member of a set. False positive matches are possible, but false negatives are not.

**Reference:** Bloom, B. H. (1970). *Space/time trade-offs in hash coding with allowable errors*. Communications of the ACM, 13(7), 422-426.
([Full text article](http://crystal.uta.edu/~mcguigan/cse6350/papers/Bloom.pdf))

```javascript
const { BloomFilter } = require('bloom-filters')

// create a Bloom Filter with size = 15 and 1% error rate
let filter = new BloomFilter(15, 0.01)

// alternatively, create a Bloom Filter from an array with 1% error rate
filter = BloomFilter.from([ 'alice', 'bob' ], 0.01)

// add some value in the filter
filter.add('alice')
filter.add('bob')

// lookup for some data
console.log(filter.has('bob')) // output: true
console.log(filter.has('daniel')) // output: false

// print false positive rate (around 0.01)
console.log(filter.rate())
```

### Partitioned Bloom Filter

A Partitioned Bloom Filter is a variation of a classic Bloom Filter.

This filter works by partitioning the M-sized bit array into k slices of size `m = M/k` bits, `k = nb of hash functions` in the filter.
Each hash function produces an index over `m` for its respective slice.
Thus, each element is described by exactly `k` bits, meaning the distribution of false positives is uniform across all elements.

Be careful, as a Partitioned Bloom Filter have much higher collison risks that a classic Bloom Filter on small sets of data.

**Reference:** Chang, F., Feng, W. C., & Li, K. (2004, March). *Approximate caches for packet classification.* In INFOCOM 2004. Twenty-third AnnualJoint Conference of the IEEE Computer and Communications Societies (Vol. 4, pp. 2196-2207). IEEE.
([Full text article](https://pdfs.semanticscholar.org/0e18/e24b37a1f4196fddf8c9ff8e4368b74cfd88.pdf))

Otherwise, a Partitioned Bloom Filter **follows the same API than a [Classic Bloom Filter](#classic-bloom-filter)**.

```javascript
const { PartitionedBloomFilter } = require('bloom-filters')

// create a Partitioned Bloom Filter with size = 15 and 1% error rate
const filter = new PartitionedBloomFilter(15, 0.01)

// now use it like a classic bloom filter!
// ...
```

### Cuckoo Filter

Cuckoo filters improve on Bloom filters by supporting deletion, limited counting, and bounded False positive rate with similar storage efficiency as a standard Bloom Filter.

**Reference:** Fan, B., Andersen, D. G., Kaminsky, M., & Mitzenmacher, M. D. (2014, December). *Cuckoo filter: Practically better than bloom.* In Proceedings of the 10th ACM International on Conference on emerging Networking Experiments and Technologies (pp. 75-88). ACM.
([Full text article](https://www.cs.cmu.edu/~dga/papers/cuckoo-conext2014.pdf))

```javascript
const { CuckooFilter } = require('bloom-filters')

// create a Cuckoo Filter with size = 15, fingerprint length = 3 and bucket size = 2
const filter = new CuckooFilter(15, 3, 2)
filter.add('alice')
filter.add('bob')

// lookup for some data
console.log(filter.has('bob')) // output: true
console.log(filter.has('daniel')) // output: false

// remove something
filter.remove('bob')
console.log(filter.has('bob')) // output: false
```

### Count Min Sketch

The Count Min Sketch (CM sketch) is a probabilistic data structure that serves as a frequency table of events in a stream of data.
It uses hash functions to map events to frequencies, but unlike a hash table uses only sub-linear space, at the expense of overcounting some events due to collisions.

**Reference:** Cormode, G., & Muthukrishnan, S. (2005). *An improved data stream summary: the count-min sketch and its applications.* Journal of Algorithms, 55(1), 58-75.
([Full text article](http://vaffanculo.twiki.di.uniroma1.it/pub/Ing_algo/WebHome/p14_Cormode_JAl_05.pdf))

```javascript
const { CountMinSketch } = require('bloom-filters')

// create a new count min sketch with epsilon = 0.001 and delta = 0.99
const sketch = new CountMinSketch(0.001, 0.99)

// push some occurrences in the sketch
sketch.update('alice')
sketch.update('alice')
sketch.update('bob')

// count occurrences
console.log(sketch.count('alice')) // output: 2
console.log(sketch.count('bob')) // output: 1
console.log(sketch.count('daniel')) // output: 0
```

## Export and import

All data structures exposed by this package can be **exported and imported to/from JSON**:

* Use the method `saveAsJSON()` to export any data structures into a JSON object.
* Use the static method `fromJSON(json)` to load a data structure from a JSON object.

```javascript
const { BloomFilter } = require('bloom-filters')

const filter = new BloomFilter(15, 0.01)
filter.add('alice')

// export a bloom filter to JSON
const exported = filter.saveAsJSON()

// do something with the JSON object (save it as file, send it to a server, etc)
// ...

// import the same filter from its JSON export
const importedFilter = BloomFilter.fromJSON(exported)
console.log(filter.has('alice')) // output: true
console.log(filter.has('bob')) // output: false
```

## Documentation

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

* [Classic Bloom Filter](http://crystal.uta.edu/~mcguigan/cse6350/papers/Bloom.pdf): Bloom, B. H. (1970). *Space/time trade-offs in hash coding with allowable errors.* Communications of the ACM, 13(7), 422-426.
* [Partitioned Bloom Filter](https://pdfs.semanticscholar.org/0e18/e24b37a1f4196fddf8c9ff8e4368b74cfd88.pdf): Chang, F., Feng, W. C., & Li, K. (2004, March). *Approximate caches for packet classification.* In INFOCOM 2004. Twenty-third AnnualJoint Conference of the IEEE Computer and Communications Societies (Vol. 4, pp. 2196-2207). IEEE.
* [Cuckoo Filter](https://www.cs.cmu.edu/~dga/papers/cuckoo-conext2014.pdf): Fan, B., Andersen, D. G., Kaminsky, M., & Mitzenmacher, M. D. (2014, December). *Cuckoo filter: Practically better than bloom.* In Proceedings of the 10th ACM International on Conference on emerging Networking Experiments and Technologies (pp. 75-88). ACM.
* [Count Min Sketch](http://vaffanculo.twiki.di.uniroma1.it/pub/Ing_algo/WebHome/p14_Cormode_JAl_05.pdf): Cormode, G., & Muthukrishnan, S. (2005). *An improved data stream summary: the count-min sketch and its applications.* Journal of Algorithms, 55(1), 58-75.

## License
[MIT License](https://github.com/Callidon/bloom-filters/blob/master/LICENSE)
