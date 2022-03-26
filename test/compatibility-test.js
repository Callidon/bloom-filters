/*
MIT License

Copyright (c) 2022 Arnaud Grall

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

require('chai').should()
const {expect} = require('chai')
const {BloomFilter, DeprecatedHashing} = require('../dist/api.js')

describe('BloomFilter Compatibility (only) between versions', () => {
  it('1.3.4 compatibility (issue #49)', () => {
    const bl = BloomFilter.create(15, 0.1)
    bl.seed = 1
    bl._hashing = new DeprecatedHashing()
    bl.add('alice')
    bl.add('bob')
    // compatibility with the current version
    expect(bl.saveAsJSON()).to.deep.equal({
      type: 'BloomFilter',
      _size: 72,
      _nbHashes: 4,
      _filter: {size: 72, content: 'AEkCAACCIAgA'},
      _seed: 1,
    })
    // these indexes are generated using the 1.3.4 version
    let indexes = bl._hashing.getDistinctIndexes(
      'alice',
      bl._size,
      bl._nbHashes,
      1
    )
    expect(indexes).to.deep.equal([59, 53, 47, 41])
    indexes = bl._hashing.getDistinctIndexes('bob', bl._size, bl._nbHashes, 1)
    expect(indexes).deep.equal([17, 14, 11, 8])

    // try to import an old 1.3.4 filter to the new format
    const filter = {
      type: 'BloomFilter',
      _seed: 1,
      _size: 72,
      _nbHashes: 4,
      _filter: [
        0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1,
        0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
    }
    const importedBl = BloomFilter.fromJSON(filter)
    importedBl._hashing = new DeprecatedHashing() // dont forget this line or the .has() wont work correctly
    bl.equals(importedBl).should.be.true
    importedBl.has('alice').should.be.true
    importedBl.has('bob').should.be.true
  })
})
