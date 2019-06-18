const Exportable = require('./exportable.js')
const utils = require('./utils.js')
const isBuffer = require('is-buffer')
// const hashObject = require('object-hash')

/**
 * Exports an Invertible Bloom Lookup Table.
 *
 * An Invertible Bloom Lookup Table is a space-efficient and probabilistic data-structure for solving the set-difference problem efficiently without the use of logs or other prior context. It computes the set difference with communication proportional to the size of the difference between the sets being compared.
 * They can simultaneously calculate D(A−B) and D(B−A) using O(d) space. This data structure encodes sets in a fashion that is similar in spirit to Tornado codes’ construction [6], in that it randomly combines elements using the XOR function
 * Reference: Eppstein, D., Goodrich, M. T., Uyeda, F., & Varghese, G. (2011). What's the difference?: efficient set reconciliation without prior context. ACM SIGCOMM Computer Communication Review, 41(4), 218-229.
 * @see {@link http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.220.6282&rep=rep1&type=pdf} for more details about Invertible Bloom Lookup Tables
 * @type {InvertibleBloomFilter}
 */
class InvertibleBloomFilter extends Exportable {
  /**
   * Construct an Invertible Bloom Lookup Table
   * @param {Number} [size=1000] Number of cells in the InvertibleBloomFilter, should be set to d * alpha where d is the number of difference and alpha a constant
   * @param {Number} [hashCount=4] The number of hash functions used, empirically studied to be 3 or 4 in most cases
   * @param {Boolean} [verbose] default true, print a warning if size is less than the hashcount
   */
  constructor (size = 1000, hashCount = 4, verbose = true) {
    super()
    if (Buffer === undefined) throw new Error('No native Buffer implementation in the browser please require the buffer package feross/buffer: require("buffer/").Buffer')
    if (typeof hashCount !== 'number' || hashCount <= 0) throw new Error('hashCount need to be a number and higher than 0')
    if (typeof size !== 'number') throw new Error('The size need to be a number')
    if (verbose && size < hashCount) {
      console.log('[Warning] the size is less than the number of hash functions')
    }
    this._size = size
    this._hashCount = hashCount
    // the number of elements in the array is n = alpha * size
    this._elements = utils.allocateArray(this._size, () => new Cell())
  }

  /**
   * Return an InvertibleBloomFilter of size 'size' and a number of hash functions used 'hashCount' with a set of inputs already inserted
   * @param  {Array}  [array=[]]    The elements to insert
   * @param  {Number} [size=1000]   The size of the InvertibleBloomFilter
   * @param  {Number} [hashCount=4] the number of hash functions used
   * @return {InvertibleBloomFilter}
   */
  static from (array = [], size = 1000, hashCount = 4) {
    const iblt = new InvertibleBloomFilter(size, hashCount)
    array.forEach(e => {
      if (isBuffer(e)) {
        iblt.add(e)
      } else {
        throw new Error('Only buffers are accepted')
      }
    })
    return iblt
  }

  /**
   * Return the number of cells of the InvertibleBloomFilter
   * @return {Number} The number of differences allowed
   */
  get size () {
    return this._size
  }

  /**
   * Return the number of elements added in the InvertibleBloomFilter
   * Complexity in time: O(alpha*d)
   * @return {Number} the number of elements in the InvertibleBloomFilter
   */
  get length () {
    return this._elements.reduce((a, b) => a + b._count, 0) / this._hashCount
  }

  /**
   * Return the number of hash functions used
   * @return {Number}
   */
  get hashCount () {
    return this._hashCount
  }

  /**
   * Return cells that store elements in this InvertibleBloomFilter
   * @return {Cell[]}
   */
  get elements () {
    return this._elements
  }

  /**
   * Add a Buffer to the InvertibleBloomFilter
   * If the element is not a Buffer it will convert it into a Buffer object
   * @param {*|Buffer} element the element to add
   */
  add (element) {
    if (!isBuffer(element)) {
      throw new Error('Only a buffer can be accepted as input.')
    } else {
      const hashes = utils.hashTwice(JSON.stringify(element), false)
      for (let i = 0; i < this._hashCount; ++i) {
        const first = parseInt(hashes.first, 16)
        const second = parseInt(hashes.second, 16)
        const indice = utils.doubleHashing(i, first, second, this._elements.length)
        this._elements[indice].add(element, Buffer.from(hashes.first))
      }
    }
  }

  /**
   * XOR 2 Invertible Bloom Filters, local xor remote
   * @param  {InvertibleBloomFilter} remote The remote to substract
   * @return {InvertibleBloomFilter} a new InvertibleBloomFilter which is the XOR of the local and remote one
   */
  substract (remote) {
    if (this._numberOfCells !== remote._numberOfCells) throw new Error('they should be of the same size')
    const toReturn = new InvertibleBloomFilter(remote._size, remote._hashCount)
    for (let i = 0; i < this._elements.length; ++i) {
      let id = null
      if (this._elements[i]._idSum === null) {
        id = remote._elements[i]._idSum
      } else if (remote._elements[i]._idSum === null) {
        id = this._elements[i]._idSum
      } else {
        id = utils.xorBuffer(this._elements[i]._idSum, remote._elements[i]._idSum)
      }

      let hash = null
      if (this._elements[i]._hashSum === null) {
        hash = remote._elements[i]._hashSum
      } else if (remote._elements[i]._hashSum === null) {
        hash = this._elements[i]._hashSum
      } else {
        hash = utils.xorBuffer(this._elements[i]._hashSum, remote._elements[i]._hashSum)
      }

      const count = this._elements[i]._count - remote._elements[i]._count
      toReturn._elements[i] = new Cell(id, hash, count)
    }
    return toReturn
  }

  /**
   * Convert the element into a Buffer that will be stored in the InvertibleBloomFilter
   * @param  {*} elem the element to convert
   * @return {Buffer} The buffer representing the element
   */
  _convert (elem) {
    return Buffer.from(JSON.stringify(elem))
  }

  /**
   * Check if two InvertibleBloomFilters are equal
   * @param  {InvertibleBloomFilter} InvertibleBloomFilter the remote InvertibleBloomFilter to compare with our
   * @return {Boolean} true if identical, false otherwise
   */
  equal (iblt) {
    if (iblt._size !== this._size || iblt._hashCount !== this._hashCount || iblt._numberOfCells !== this._numberOfCells) {
      return false
    } else {
      for (let i = 0; i < iblt._elements.length; ++i) {
        if (!iblt._elements[i].equal(this._elements[i])) return false
      }
      return true
    }
  }

  /**
   * Decode an InvertibleBloomFilter based on its substracted version
   * @param  {InvertibleBloomFilter} substractedInvertibleBloomFilter The Iblt to decode after being substracted
   * @return {Object}
   */
  static decode (substractedInvertibleBloomFilter) {
    const samb = []
    const sbma = []
    const pureList = []
    for (let i = 0; i < substractedInvertibleBloomFilter._elements.length; ++i) {
      if (substractedInvertibleBloomFilter._elements[i].isPure()) {
        pureList.push(i)
      }
    }
    while (pureList.length !== 0) {
      const i = pureList.pop()
      if (!substractedInvertibleBloomFilter._elements[i].isPure()) {
        continue
      } else {
        const s = substractedInvertibleBloomFilter._elements[i]._idSum
        const c = substractedInvertibleBloomFilter._elements[i]._count
        if (c > 0) {
          samb.push(s)
        } else {
          sbma.push(s)
        }

        const hashes = utils.hashTwice(JSON.stringify(s), false)
        for (let j = 0; j < substractedInvertibleBloomFilter._hashCount; ++j) {
          const indice = utils.doubleHashing(j, parseInt(hashes.first, 16), parseInt(hashes.second, 16), substractedInvertibleBloomFilter._elements.length)
          substractedInvertibleBloomFilter._elements[indice].xorm(new Cell(s, Buffer.from(hashes.first), c))
        }
      }
    } // endwhile
    for (let i = 0; i < substractedInvertibleBloomFilter._elements.length; ++i) {
      if (substractedInvertibleBloomFilter._elements[i]._idSum === null && substractedInvertibleBloomFilter._elements[i]._hashSum === null && substractedInvertibleBloomFilter._elements[i]._count === 0) {
        continue
      } else {
        const idEmpty = utils.isEmptyBuffer(substractedInvertibleBloomFilter._elements[i].id)
        const hashEmpty = utils.isEmptyBuffer(substractedInvertibleBloomFilter._elements[i].hash)
        const count = substractedInvertibleBloomFilter._elements[i]._count === 0
        if (!idEmpty || !hashEmpty || !count) {
          return {
            success: false,
            reason: {
              cell: substractedInvertibleBloomFilter._elements[i],
              idEmpty,
              hashEmpty,
              count
            },
            additional: samb,
            missing: sbma
          }
        }
      }
    }
    return {
      success: true,
      additional: samb,
      missing: sbma
    }
  }
}

/**
 * A cell is composed of an idSum which the XOR of all element inserted in that cell, a hashSum which is the XOR of all hashed element in that cell and a counter which is the number of elements inserted in that cell.
 */
class Cell {
  constructor (id = null, sum = null, count = 0) {
    this._idSum = id
    this._hashSum = sum
    this._count = count
  }

  get id () {
    return this._idSum
  }

  get hash () {
    return this._hashSum
  }

  get count () {
    return this._count
  }

  /**
   * Add an element in this cell
   * @param {Buffer} id The element to XOR in this cell
   * @param {Number} hash The hash of the element to XOR in this cell
   */
  add (id, hash) {
    if (this._idSum === null) {
      this._idSum = id
    } else {
      this._idSum = utils.xorBuffer(this._idSum, id)
    }
    if (this._hashSum === null) {
      this._hashSum = hash
    } else {
      this._hashSum = utils.xorBuffer(this._hashSum, hash)
    }
    this._count++
  }

  xorm (cell) {
    if (this._idSum !== null && cell._idSum !== null) {
      this._idSum = utils.xorBuffer(this._idSum, cell._idSum)
    } else if (this._idSum === null) {
      this._idSum = cell._idSum
    }
    if (this._hashSum !== null && cell._hashSum !== null) {
      this._hashSum = utils.xorBuffer(this._hashSum, cell._hashSum)
    } else if (this._hashSum === null) {
      this._hashSum = cell._hashSum
    }

    this._count = this._count - cell._count
  }

  /**
   * Check if another Cell is identical to this one
   * @param  {Cell} cell the cell to compare with
   * @return {Boolean}  true if identical, false otherwise
   */
  equal (cell) {
    return cell._count === this._count && cell._hashSum === this._hashSum && cell._idSum === this._idSum
  }

  /**
   * Return true if the cell is considered as "Pure"
   * A pure cell is a cell with a counter equal to 1 or -1
   * And with a hash equal to the id hashed
   * @return {Boolean} [description]
   */
  isPure () {
    if (this._idSum === null || this._hashSum === null) return false
    // it must be either 1 or -1
    if (this._count !== 1 && this._count !== -1) return false

    const hashes = utils.hashTwice(JSON.stringify(this._idSum), false)
    // hashed id must be equal to the hash sum
    if (this._hashSum.toString() !== hashes.first) return false
    return true
  }
}

module.exports = {
  Cell, InvertibleBloomFilter
}
