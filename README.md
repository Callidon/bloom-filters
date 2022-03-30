# Bloom-Filters [![Master](https://github.com/callidon/bloom-filters/actions/workflows/npm_test_doc.yml/badge.svg)](https://github.com/Callidon/bloom-filters/actions)

JavaScript/TypeScript implementation of probabilistic data structures: Bloom Filter (and its derived), HyperLogLog, Count-Min Sketch, Top-K and MinHash.
**This package relies on [non-cryptographic hash functions](https://cyan4973.github.io/xxHash/)**.

📕[Online documentation](https://callidon.github.io/bloom-filters/)

**Keywords:** _bloom filter, cuckoo filter, KyperLogLog, MinHash, Top-K, probabilistic data-structures, XOR-Filter._

❗️**Compatibility**❗️

- Be carefull when migrating from a version to another.
- Bug fixes were introduced in `1.3.7` and from `1.3.9` to `2.0.0+` for hashing and indexing data. Then, you **must re-build completely your filters from start** to be compatible with the new versions.
- To keep the `breaking changes` rule of npm versions we will make now new `majored versions` since 1.3.9 whenever a modification is done on the hashing/indexing system or breaks the current API.

# Table of contents

- [Installation](#installation)
- [Data structures](#data-structures)
  - [Classic Bloom Filter](#classic-bloom-filter)
  - [Partitioned Bloom Filter](#partitioned-bloom-filter)
  - [Scalable Bloom Filter](#scalable-bloom-filter)
  - [Cuckoo Filter](#cuckoo-filter)
  - [Counting Bloom Filter](#counting-bloom-filter)
  - [Count Min Sketch](#count-min-sketch)
  - [HyperLogLog](#hyperloglog)
  - [MinHash](#minhash)
  - [Top-K](#top-k)
  - [Invertible Bloom Filters](#invertible-bloom-filters)
  - [XOR-Filter](#xor-filter)
- [Export and import](#export-and-import)
- [Seeding and Hashing](#seeding-and-hashing)
- [Documentation](#documentation)
- [Tests](#tests-and-development)
- [References](#references)
- [Changelog](#changelog)
- [License](#license)

## Installation

```bash
npm install bloom-filters --save
```

**Supported platforms**

- [Node.js](https://nodejs.org): _v4.0.0_ or higher
- [Google Chrome](https://www.google.com/intl/en/chrome/): _v41_ or higher
- [Mozilla Firefox](https://www.mozilla.org/en-US/firefox/new/): _v34_ or higher
- [Microsoft Edge](https://www.microsoft.com/en-US/edge): _v12_ or higher

## Data structures

### Classic Bloom Filter

A Bloom filter is a space-efficient probabilistic data structure, conceived by Burton Howard Bloom in 1970,
that is used to test whether an element is a member of a set. False positive matches are possible, but false negatives are not.

**Reference:** Bloom, B. H. (1970). _Space/time trade-offs in hash coding with allowable errors_. Communications of the ACM, 13(7), 422-426.
([Full text article](http://crystal.uta.edu/~mcguigan/cse6350/papers/Bloom.pdf))

#### Methods

- `add(element: HashableInput) -> void`: add an element into the filter.
- `has(element: HashableInput) -> boolean`: Test an element for membership, returning False if the element is definitively not in the filter and True is the element might be in the filter.
- `equals(other: BloomFilter) -> boolean`: Test if two filters are equals.
- `rate() -> number`: compute the filter's false positive rate (or error rate).

```javascript
const {BloomFilter} = require('bloom-filters')
// create a Bloom Filter with a size of 10 and 4 hash functions
let filter = new BloomFilter(10, 4)
// insert data
filter.add('alice')
filter.add('bob')

// lookup for some data
console.log(filter.has('bob')) // output: true
console.log(filter.has('daniel')) // output: false

// print the error rate
console.log(filter.rate())

// alternatively, create a bloom filter optimal for a number of items and a desired error rate
const items = ['alice', 'bob']
const errorRate = 0.04 // 4 % error rate
filter = BloomFilter.create(items.length, errorRate)

// or create a bloom filter optimal for a collections of items and a desired error rate
filter = BloomFilter.from(items, errorRate)
```

### Partitioned Bloom Filter

A Partitioned Bloom Filter is a variation of a classic Bloom Filter.

This filter works by partitioning the M-sized bit array into k slices of size `m = M/k` bits, `k = nb of hash functions` in the filter.
Each hash function produces an index over `m` for its respective slice.
Thus, each element is described by exactly `k` bits, meaning the distribution of false positives is uniform across all elements.

Be careful, as a Partitioned Bloom Filter have much higher collison risks that a classic Bloom Filter on small sets of data.

**Reference:** Chang, F., Feng, W. C., & Li, K. (2004, March). _Approximate caches for packet classification._ In INFOCOM 2004. Twenty-third AnnualJoint Conference of the IEEE Computer and Communications Societies (Vol. 4, pp. 2196-2207). IEEE.
([Full text article](http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.153.6902&rep=rep1&type=pdf))

#### Methods

- `add(element: HashableInput) -> void`: add an element into the filter.
- `has(element: HashableInput) -> boolean`: Test an element for membership, returning False if the element is definitively not in the filter and True is the element might be in the filter.
- `equals(other: PartitionedBloomFilter) -> boolean`: Test if two filters are equals.
- `rate() -> number`: compute the filter's false positive rate (or error rate).

```javascript
const {PartitionedBloomFilter} = require('bloom-filters')

// create a PartitionedBloomFilter of size 10, with 5 hash functions and a load factor of 0.5
const filter = new PartitionedBloomFilter(10, 5, 0.5)

// add some value in the filter
filter.add('alice')
filter.add('bob')

// lookup for some data
console.log(filter.has('bob')) // output: true
console.log(filter.has('daniel')) // output: false

// now use it like a classic bloom filter!
// ...

// alternatively, create a PartitionedBloomFilter optimal for a number of items and a desired error rate
const items = ['alice', 'bob']
const errorRate = 0.04 // 4 % error rate
filter = PartitionedBloomFilter.create(items.length, errorRate)

// or create a PartitionedBloomFilter optimal for a collections of items and a desired error rate
filter = PartitionedBloomFilter.from(items, errorRate)
```

### Scalable Bloom Filter

A Scalable Bloom Filter is a variant of Bloom Filters that can adapt dynamically to the
number of elements stored, while assuring a maximum false positive probability

**Reference:** ALMEIDA, Paulo Sérgio, BAQUERO, Carlos, PREGUIÇA, Nuno, et al. Scalable bloom filters. Information Processing Letters, 2007, vol. 101, no 6, p. 255-261.
([Full text article](https://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.725.390&rep=rep1&type=pdf))

This filter use internally [Paritionned Bloom Filters](#partitioned-bloom-filter).

#### Methods

- `add(element: HashableInput) -> void`: add an element into the filter.
- `has(element: HashableInput) -> boolean`: Test an element for membership, returning False if the element is definitively not in the filter and True is the element might be in the filter.
- `equals(other: ScalableBloomFilter) -> boolean`: Test if two filters are equals.
- `capacity():number` -> return the total capacity of this filter
- `rate() -> number`: compute the filter's false positive rate (or error rate).

```javascript
const {ScalableBloomFilter} = require('bloom-filters')

// by default it creates an ideally scalable bloom filter for 8 elements with an error rate of 0.01 and a load factor of 0.5
const filter = new ScalableBloomFilter()
filter.add('alice')
filter.add('bob')
filter.add('carl')
for (let i = 0; i < 10000; i++) {
  filter.add('elem:' + i)
}
filter.has('somethingwrong') // false

filter.capacity() // total capacity
filter.rate() // current rate of the current internal filter used
```

### Cuckoo Filter

Cuckoo filters improve on Bloom filters by supporting deletion, limited counting, and bounded False positive rate with similar storage efficiency as a standard Bloom Filter.

**Reference:** Fan, B., Andersen, D. G., Kaminsky, M., & Mitzenmacher, M. D. (2014, December). _Cuckoo filter: Practically better than bloom._ In Proceedings of the 10th ACM International on Conference on emerging Networking Experiments and Technologies (pp. 75-88). ACM.
([Full text article](https://www.cs.cmu.edu/~dga/papers/cuckoo-conext2014.pdf))

#### Methods

- `add(element: HashableInput) -> void`: add an element into the filter.
- `remove(element: HashableInput) -> boolean`: delete an element from the filter, returning True if the deletion was a success and False otherwise.
- `has(element: HashableInput) -> boolean`: Test an element for membership, returning False if the element is definitively not in the filter and True is the element might be in the filter.
- `equals(other: CuckooFilter) -> boolean`: Test if two filters are equals.
- `rate() -> number`: compute the filter's false positive rate (or error rate).

```javascript
const {CuckooFilter} = require('bloom-filters')

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

// alternatively, create a Cuckoo Filter optimal for a number of items and a desired error rate
const items = ['alice', 'bob']
const errorRate = 0.04 // 4 % error rate
filter = CuckooFilter.create(items.length, errorRate)

// or create a Cuckoo Filter optimal for a collections of items and a desired error rate
filter = CuckooFilter.from(items, errorRate)
```

**WARNING**: The error rate cannot be higher than `1 * 10^-18`. Above this value, you will get an exception stating that the fingerprint length is higher than the hash length.

### Counting Bloom Filter

A Counting Bloom filter works in a similar manner as a regular Bloom filter; however, it is able to keep track of insertions and deletions. In a counting Bloom filter, each entry in the Bloom filter is a small counter associated with a basic Bloom filter bit.

**Reference:** F. Bonomi, M. Mitzenmacher, R. Panigrahy, S. Singh, and G. Varghese, “An Improved Construction for Counting Bloom Filters,” in 14th Annual European Symposium on Algorithms, LNCS 4168, 2006

#### Methods

- `add(element: HashableInput) -> void`: add an element into the filter.
- `remove(element: HashableInput) -> boolean`: delete an element from the filter, returning True if the deletion was a success and False otherwise.
- `has(element: HashableInput) -> boolean`: Test an element for membership, returning False if the element is definitively not in the filter and True is the element might be in the filter.
- `equals(other: CountingBloomFilter) -> boolean`: Test if two filters are equals.
- `rate() -> number`: compute the filter's false positive rate (or error rate).

```javascript
const CountingBloomFilter = require('bloom-filters').CountingBloomFilter

// create a Bloom Filter with capacity = 15 and 4 hash functions
let filter = new CountingBloomFilter(15, 4)

// add some value in the filter
filter.add('alice')
filter.add('bob')
filter.add('carole')

// remove some value
filter.remove('carole')

// lookup for some data
console.log(filter.has('bob')) // output: true
console.log(filter.has('carole')) // output: false
console.log(filter.has('daniel')) // output: false

// print false positive rate (around 0.1)
console.log(filter.rate())

// alternatively, create a Counting Bloom Filter optimal for a number of items and a desired error rate
const items = ['alice', 'bob']
const errorRate = 0.04 // 4 % error rate
filter = CountingBloomFilter.create(items.length, errorRate)

// or create a Counting Bloom Filter optimal for a collections of items and a desired error rate
filter = CountingBloomFilter.from(items, errorRate)
```

### Count Min Sketch

The Count Min Sketch (CM sketch) is a probabilistic data structure that serves as a frequency table of events in a stream of data.
It uses hash functions to map events to frequencies, but unlike a hash table uses only sub-linear space, at the expense of overcounting some events due to collisions.

**Reference:** Cormode, G., & Muthukrishnan, S. (2005). _An improved data stream summary: the count-min sketch and its applications._ Journal of Algorithms, 55(1), 58-75.
([Full text article](http://dimacs.rutgers.edu/~graham/pubs/papers/cm-full.pdf))

#### Methods

- `update(element: HashableInput, count = 1) -> void`: add `count` occurences of an element into the sketch.
- `count(element: HashableInput) -> number`: estimate the number of occurences of an element.
- `merge(other: CountMinSketch) -> CountMinSketch`: merge occurences of two sketches.
- `equals(other: CountMinSketch) -> boolean`: Test if two sketchs are equals.
- `clone(): CountMinSketch`: Clone the sketch.

```javascript
const {CountMinSketch} = require('bloom-filters')

// create a new Count Min sketch with 2048 columns and 1 row
const sketch = new CountMinSketch(2048, 1)

// push some occurrences in the sketch
sketch.update('alice')
sketch.update('alice')
sketch.update('bob')

// count occurrences
console.log(sketch.count('alice')) // output: 2
console.log(sketch.count('bob')) // output: 1
console.log(sketch.count('daniel')) // output: 0

// alternatively, create a Count Min sketch optimal for a target error rate and probability of accuracy
const items = ['alice', 'bob']
const errorRate = 0.04 // 4 % error rate
const accuracy = 0.99 // 99% accuracy
sketch = CountMinSketch.create(errorRate, accuracy)

// or create a Count Min Sketch optimal for a collections of items,
// a target error rate and probability of accuracy
sketch = CountMinSketch.from(items, errorRate, accuracy)
```

### HyperLogLog

HyperLogLog is an algorithm for the count-distinct problem, approximating the number of distinct elements in a multiset. Calculating the exact cardinality of a multiset requires an amount of memory proportional to the cardinality, which is impractical for very large data sets. Probabilistic cardinality estimators, such as the HyperLogLog algorithm, use significantly less memory than this, at the cost of obtaining only an approximation of the cardinality.
The HyperLogLog algorithm is able to estimate cardinalities greather than `10e9` with a typical accuracy (standard error) of `2%`, using around 1.5 kB of memory (see reference).

**Reference:** Philippe Flajolet, Éric Fusy, Olivier Gandouet and Frédéric Meunier (2007). _"Hyperloglog: The analysis of a near-optimal cardinality estimation algorithm"_. Discrete Mathematics and Theoretical Computer Science Proceedings.
([Full text article](http://algo.inria.fr/flajolet/Publications/FlFuGaMe07.pdf))

#### Methods

- `update(element: HashableInput) -> void`: add a new occurence of an element to the sketch.
- `count() -> number`: estimate the number of distinct elements in the sketch.
- `merge(other: HyperLogLog) -> HyperLogLog`: merge occurences of two sketches.
- `equals(other: HyperLogLog) -> boolean`: Test if two sketchs are equals.

```javascript
const {HyperLogLog} = require('bloom-filters')

// create a new HyperLogLog with 100 registers
const sketch = new HyperLogLog(100)

// push some occurrences in the sketch
sketch.update('alice')
sketch.update('alice')
sketch.update('bob')

// count occurrences
console.log(sketch.count())

// print accuracy
console.log(sketch.accuracy())
```

### MinHash

**MinHash** (or the min-wise independent permutations locality sensitive hashing scheme) is a technique for quickly estimating how similar two sets are.
The goal of MinHash is to estimate the _Jaccard similarity coefficient_, a commonly used indicator of the similarity between two sets, without explicitly computing the intersection and union of the two sets.
It does so by computing fixed sized signatures for a set of numbers using randomly generated hash functions.

❗️**WARNINGS**❗

- A `MinHash` class only accepts `numbers` (integers and floats) as inputs.
- Two MinHash can be compared **only if they share the same set of randomly generated hash functions**. To ease the creation of MinHash sets, we introduce a `MinHashFactory` class that is able to create MinHash structures that _share the same set of hash functions_. We recommend most users **to rely on the factory**, but the `MinHash` class remains importable for advanced usage.

**Reference:** Andrei Z. Broder, _"On the resemblance and containment of documents"_, in Compression and Complexity of Sequences: Proceedings (1997).
([Full text article](https://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.24.779&rep=rep1&type=pdf))

#### `MinHashFactory` methods

- `create() -> MinHash`: create a new empty MinHash structure, using the parameters of the factory.

#### `MinHash` methods

- `add(element: number) -> void`: add a new element to the set.
- `bulkLoad(elements: number[]) -> void`: efficently add several new elements to the set.
- `isEmpty() -> boolean`: test if the signature of the MinHash is empty.
- `compareWith(other: MinHash) -> number`: estimate the Jaccard similarity coefficient with another MinHash set.

```javascript
const {MinHashFactory} = require('bloom-filters')

// create the MinHashFactory, to create several comparable MinHash sets
// it uses 10 random hash functions and expect to see a maximum value of 999
const factory = new MinHashFactory(10, 999)

// create two empty MinHash
const fistSet = factory.create()
const secondSet = factory.create()

// push some occurrences in the first set
fistSet.add(1)
fistSet.add(2)

// the MinHash class also supports bulk loading
secondSet.bulkLoad([1, 3, 4])

// estimate the jaccard similarity between the two sets
const jaccardSim = fistSet.compareWith(secondSet)
console.log(`The estimated Jaccard similarity is ${jaccardSim}`)
```

### Top-K

Given a multiset of elements, the **Top-K problem** is to compute the ranking of these elements (by an arbitrary score) and returns the `k` results with the highest scores.
This package provides an implementation of the Top-K problem that sort items based on their estimated cardinality in the multiset. It is based on a Count Min Sketch, for estimating the cardinality of items, and a MinHeap, for implementing a sliding window over the `k` results with the highest scores.

Items produced by the `TopK` class are JavaScript objects with the following content (shown in Typescript notation).

```typescript
interface TopkElement {
  // The element's value
  value: string
  // The element's frequency
  frequency: number
  // The element's rank in the TopK, ranging from 1 to k
  rank: number
}
```

#### Methods

- `add(element: string, count: number = 1) -> void`: add one or more new occurences of an element to the sketch.
- `values() -> Array<TopkElement>`: get the top-k values as an array of objects.
- `iterator() -> Iterator<TopkElement>`: get the top-k values as an iterator that yields objects.

```javascript
const {TopK} = require('bloom-filters')

// create a new TopK with k = 10, an error rate of 0.001 and an accuracy of 0.99
const topk = new TopK(10, 0.001, 0.99)

// push occurrences one-at-a-time in the multiset
topk.add('alice')
topk.add('bob')
topk.add('alice')

// or, equally, push multiple occurrences at-once in the multiset
// topk.add('alice', 2)
// topk.add('bob', 1)

// print the top k values
for (let item of topk.values()) {
  console.log(
    `Item "${item.value}" is in position ${item.rank} with an estimated frequency of ${item.frequency}`
  )
}
// Output:
// Item "alice" is in position 1 with an estimated frequency of 2
// Item "bob" is in position 2 with an estimated frequency of 1
```

### Invertible Bloom Filters

An Invertible Bloom Filters (IBLT), also called Invertible Bloom Lookup Table, is a space-efficient and probabilistic data-structure for solving the set-difference problem efficiently without the use of logs or other prior context. It computes the set difference with communication proportional to the size of the difference between the sets being compared.
They can simultaneously calculate D(A−B) and D(B−A) using O(d) space. This data structure encodes sets in a fashion that is similar in spirit to Tornado codes’ construction, in that it randomly combines elements using the XOR function.

❗️**WARNING**❗️ An IBLT only accepts [`Buffer`](https://nodejs.org/api/buffer.html) as inputs. If you are using `bloom-filters` in a Web browser, you might consider using the [`feros/buffer`](https://www.npmjs.com/package/buffer) package, which provides a polyfill for `Buffer` in a browser.

**Reference:** Eppstein, D., Goodrich, M. T., Uyeda, F., & Varghese, G. (2011). _What's the difference?: efficient set reconciliation without prior context._ ACM SIGCOMM Computer Communication Review, 41(4), 218-229.
([Full text article](http://www.sysnet.ucsd.edu/sysnet/miscpapers/EppGooUye-SIGCOMM-11.pdf))

#### Methods

- `add(element: Buffer) -> void`: add an element into the filter.
- `remove(element: Buffer) -> void`: delete an element from the filter, returning True if the deletion was a success and False otherwise.
- `has(element: Buffer) -> boolean`: Test an element for membership, returning False if the element is definitively not in the filter and True is the element might be in the filter.
- `equals(other: InvertibleBloomFilter) -> boolean`: Test if two filters are equals.
- `substract(remote: InvertibleBloomFilter)`: peform the XOR substraction of two IBLTs.
- `decode() -> {additional: Buffer[], missing: Buffer[]} `: decode an IBLT.
- `listEntries() -> Generator<Buffer, number, void>`: list all entries in the IBLT using a Generator.

```javascript
const {InvertibleBloomFilter} = require('bloom-filters')

const hashcount = 3
const size = 50
const iblt = new InvertibleBloomFilter(size, hashcount)

// push some data in the IBLT
iblt.add(Buffer.from('alice'))
iblt.add(Buffer.from('42'))
iblt.add(Buffer.from('help'))
iblt.add(Buffer.from('meow'))
iblt.add(Buffer.from('json'))

console.log(ilbt.has(Buffer.from('alice'))) // output: true
console.log(ilbt.has(Buffer.from('daniel'))) // output: false

iblt.remove(Buffer.from('alice'))
console.log(ilbt.has(Buffer.from('alice'))) // output: false

// Now, let's demonstrate the decoding power of IBLT!
const remote = new InvertibleBloomFilter(size, hashcount)
remote.add(Buffer.from('alice'))
remote.add(Buffer.from('car'))
remote.add(Buffer.from('meow'))
remote.add(Buffer.from('help'))

// decode the difference between the two filters
const result = iblt.substract(remote).decode()

console.log(
  `Did we successfully decode the subtracted iblts? ${result.success}. Why? $${result.reason}`
)
console.log(
  `Elements of iblt missing elements from remote: ${result.additional}`
)
console.log(`Elements of remote missing elements from iblt: ${result.missing}`)

// alternatively, create an IBLT optimal for a number of items and a desired error rate
const items = [Buffer.from('alice'), Buffer.from('bob')]
const errorRate = 0.04 // 4 % error rate
filter = InvertibleBloomFilter.create(items.length, errorRate)

// or create an IBLT optimal for a collections of items and a desired error rate
filter = InvertibleBloomFilter.from(items, errorRate)
```

**Tuning the IBLT** We recommend to use at least a **hashcount** of 3 and an **alpha** of 1.5 for at least 50 differences, which equals to 1.5\*50 = 75 cells. Then, if you insert a huge number of values in there, the decoding will work (whatever the number of differences less than 50) but testing the presence of a value is still probabilistic, based on the number of elements inserted (Even for the functions like listEntries). For more details, you should read the seminal research paper on IBLTs ([full-text article](http://www.sysnet.ucsd.edu/sysnet/miscpapers/EppGooUye-SIGCOMM-11.pdf)).

### XOR Filter

**Available as 8-bits and 16-bits fingerprint length**

A XOR Filter is a better space-efficient probabilistic data structure than Bloom Filters.
Very usefull for space efficiency of readonly sets.

**Reference:** Graf, Thomas Mueller, and Daniel Lemire. "Xor filters: Faster and smaller than bloom and cuckoo filters." Journal of Experimental Algorithmics (JEA) 25 (2020): 1-16.
([Full text article](https://arxiv.org/abs/1912.08258))

#### Methods

- `add(elements: XorHashableInput[]) -> void`: Add elements to the filter. Calling more than once this methods will override the current filter with the new elements.
- `has(element: XorHashableInput) -> boolean`: true/false whether the element is in the set or not.

---

- Extended input types: `type XorHashableInput = HashableInput | Long`
- We use Buffers internally which are exported/imported to/from `base64` strings.

```javascript
const {XorFilter} = require('bloom-filters')
const xor8 = new XorFilter(1)
xor8.add(['a'])
xor8.has('a') // true
xor8.has('b') // false
// or the combined
const filter = XorFilter.create(['a'])
filter.has('a') // true
// using 16-bits fingerprint length
XorFilter.create(['a'], 16).has('a') // true
const a = new XorFilter(1, 16)
a.add(['a'])
a.has('a') // true
```

## Export and import

All data structures exposed by this package can be **exported and imported to/from JSON**:

- Use the method `saveAsJSON()` to export any data structures into a JSON object.
- Use the static method `fromJSON(json)` to load a data structure from a JSON object.

```javascript
const {BloomFilter} = require('bloom-filters')

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

## Seeding and Hashing

By default every hash function is seeded with an internal seed which is equal to `0x1234567890`. If you want to change it:

```javascript
const { BloomFilter } = require('bloom-filter')
const bl = new BloomFilter(...)
console.log(bl.seed) // 78187493520
bl.seed = 0xABCD
console.log(bl.seed) // 43981
```

By default we hash elements using `XXH.h64` function from [`xxhashjs`](https://github.com/pierrec/js-xxhash).
In the case you want to use your own hash functions, you can use your own Hashing class by extending the default one. Example:

```js
const {BloomFilter, Hashing} = require('bloom-filters')

class CustomHashing extends Hashing {
  serialize(_element, _seed) {
    return Number(1)
  }
}

const bl = BloomFilter.create(2, 0.01)
// override just your structure locally
bl._hashing = new CustomHashing()
bl.add('a')
```

See `test/utils-test.js` "_Use different hash functions_" describe close.

## Documentation

See [documentation online](https://callidon.github.io/bloom-filters/) or generate it in directory `doc/` with: `npm run doc`

## Tests and Development

- Tests are performed using [mocha](https://github.com/mochajs/mocha) and [nyc](https://github.com/istanbuljs/nyc) (code coverage) on node 12.x, 14.x, 15.x and 16.x for the moment.
- Linting and formatting are made using `prettier` and `eslint`

When submitting pull requests please follow the following guidance:

- Please open pull requests on the develop branch. **Direct contributions to the master branch will be refused without comments**
- Add tests when possible in the `test` folder.
- Functions, methods, variables and types must be documented using typedoc annotations
- Run `yarn test` (build, lint and run the mocha tests suite)

## References

- [Classic Bloom Filter](http://crystal.uta.edu/~mcguigan/cse6350/papers/Bloom.pdf): Bloom, B. H. (1970). _Space/time trade-offs in hash coding with allowable errors._ Communications of the ACM, 13(7), 422-426.
- [Partitioned Bloom Filter](http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.153.6902&rep=rep1&type=pdf): Chang, F., Feng, W. C., & Li, K. (2004, March). _Approximate caches for packet classification._ In INFOCOM 2004. Twenty-third AnnualJoint Conference of the IEEE Computer and Communications Societies (Vol. 4, pp. 2196-2207). IEEE.
- [Cuckoo Filter](https://www.cs.cmu.edu/~dga/papers/cuckoo-conext2014.pdf): Fan, B., Andersen, D. G., Kaminsky, M., & Mitzenmacher, M. D. (2014, December). _Cuckoo filter: Practically better than bloom._ In Proceedings of the 10th ACM International on Conference on emerging Networking Experiments and Technologies (pp. 75-88). ACM.
- [Counting Bloom Filter](http://www.eecs.harvard.edu/~michaelm/postscripts/esa2006b.pdf): F. Bonomi, M. Mitzenmacher, R. Panigrahy, S. Singh, and G. Varghese, _An Improved Construction for Counting Bloom Filters_, in 14th Annual European Symposium on Algorithms, LNCS 4168, 2006, pp.
- [Count Min Sketch](http://vaffanculo.twiki.di.uniroma1.it/pub/Ing_algo/WebHome/p14_Cormode_JAl_05.pdf): Cormode, G., & Muthukrishnan, S. (2005). _An improved data stream summary: the count-min sketch and its applications._ Journal of Algorithms, 55(1), 58-75.
- [HyperLogLog](http://algo.inria.fr/flajolet/Publications/FlFuGaMe07.pdf): Philippe Flajolet, Éric Fusy, Olivier Gandouet and Frédéric Meunier (2007). _"Hyperloglog: The analysis of a near-optimal cardinality estimation algorithm"_. Discrete Mathematics and Theoretical Computer Science Proceedings.
- [MinHash](https://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.24.779&rep=rep1&type=pdf): Andrei Z. Broder, _"On the resemblance and containment of documents"_, in Compression and Complexity of Sequences: Proceedings (1997).
- [Invertible Bloom Filters](http://www.sysnet.ucsd.edu/sysnet/miscpapers/EppGooUye-SIGCOMM-11.pdf): Eppstein, D., Goodrich, M. T., Uyeda, F., & Varghese, G. (2011). _What's the difference?: efficient set reconciliation without prior context._ ACM SIGCOMM Computer Communication Review, 41(4), 218-229.
- [Xor Filters: Faster and Smaller Than Bloom and Cuckoo Filters](https://arxiv.org/abs/1912.08258) Thomas Mueller Graf, Daniel Lemire, Journal of Experimental Algorithmics 25 (1), 2020. DOI: 10.1145/3376122
- [Scalable Bloom Filters](https://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.725.390&rep=rep1&type=pdf) ALMEIDA, Paulo Sérgio, BAQUERO, Carlos, PREGUIÇA, Nuno, et al. _Scalable bloom filters_. Information Processing Letters, 2007, vol. 101, no 6, p. 255-261.

## Changelog

| **Version** | **Release date** | **Major changes**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `v2.1.0`    | 03/2022          | - Add Scalable Bloom filters <br/> - Use array of BitSet for Partitionned Bloom Filter <br/> - Fix wrong MinHash comparison                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `v2.0.0`    | 02/2022          | - Use correctly double hashing [#issue43](https://github.com/Callidon/bloom-filters/issues/43). <br/> - Move all hashing related functions to its specific Hash class in a component of the BaseFilter class. It also allows for overriding the serizalize function for using custom hash functions <br/> - Add [#PR44](https://github.com/Callidon/bloom-filters/pull/44) optimizing the BloomFilter internal storage with Uint arrays. <br/> - Disable 10.x, 15.x node tests. <br/> - Add XorFilter [#29](https://github.com/Callidon/bloom-filters/issues/29) <br/> - Add `.nextInt32()` function to get a new random seeded int 32-bits from the current seed. <br/> - Make all properties public for allowing developpers to override everything. |
| `v1.3.0`    | 10/04/2020       | Added the MinHash set                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `v1.2.0`    | 08/04/2020       | Add the TopK class                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `v1.1.0`    | 03/04/2020       | Add the HyperLogLog sketch                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `v1.0.0`    | 23/03/2020       | Rework the whole library using TypeScript, unify the API and fix the documentation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `v0.8.0`    | 11/11/2019       | Fix some issues with the cuckoo filter (performances). Fix the global API. It allows now to customize each Filter. If you want to use the old API, use the `.create()` or `.from()` functions to match the old api.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `v0.7.1`    | 11/09/2019       | Add the Counting Bloom Filter                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `v0.7.0`    | 01/07/2019       | Move to [XXHASH](https://cyan4973.github.io/xxHash/) for hashing elements in the library. One property has been added into the exported json `_seed` which is used to seed every hash of every elements. Update Invertible Bloom Filters with #add, #has, #delete, #listEntries, #substract, #Static.decode methods. Updated the way to get distinct indices which could have collisions in many cases.                                                                                                                                                                                                                                                                                                                                                |
| `v0.6.1`    | 18/06/2019       | Add Invertible Bloom Filters (only #encode/#substract/#Static.decode methods)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

## License

[MIT License](https://github.com/Callidon/bloom-filters/blob/master/LICENSE)
