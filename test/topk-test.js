/* file : topk-test.js
MIT License

Copyright (c) 2017-2020 Thomas Minier & Arnaud Grall

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
const {TopK} = require('../dist/api.js')

describe('TopK', () => {
  const lessThanOrEqualTestCaseItems = [
    'alice',
    'bob',
    'alice',
    'carol',
    'bob',
    'alice',
  ]

  const moreThanTestCaseItems = [
    'alice',
    'daniel',
    'esther',
    'bob',
    'alice',
    'bob',
    'alice',
    'carol',
    'carol',
    'alice',
    'bob',
  ]

  const expectedTop = ['alice', 'bob', 'carol']

  describe('#add', () => {
    it('should produce equivalent TopK estimations when using count parameter', () => {
      const k = 3
      const errorRate = 0.001
      const accuracy = 0.999
      const freqTable = {}

      /*
       * Add items to the traditional one-at-a-time variant while concurrently
       * building a frequency table to be used for the all-at-once variant.
       */
      const topkOneAtATime = new TopK(k, errorRate, accuracy)
      for (const item of lessThanOrEqualTestCaseItems) {
        topkOneAtATime.add(item)
        if (!Object.hasOwnProperty.call(freqTable, item)) {
          freqTable[`${item}`] = 0
        }
        ++freqTable[`${item}`]
      }

      /* Ensure the built frequency table is correct. */
      const expectedFreqTable = lessThanOrEqualTestCaseItems.reduce(
        (acc, curr) => {
          if (!Object.hasOwnProperty.call(acc, curr)) {
            acc[`${curr}`] = 1
          } else {
            ++acc[`${curr}`]
          }

          return acc
        },
        {}
      )
      freqTable.should.to.deep.equal(expectedFreqTable)

      /* Build a version of TopK using the frequency as count */
      const topkAllAtOnce = new TopK(k, errorRate, accuracy)
      for (const [item, freq] of Object.entries(freqTable)) {
        topkAllAtOnce.add(item, freq)
      }

      const topkOneAtATimeValues = topkOneAtATime.values()
      const topkOneAtATimeKeys = topkOneAtATimeValues.map(({value}) => value)
      const topkAllAtOnceValues = topkAllAtOnce.values()
      const topkAllAtOnceKeys = topkAllAtOnceValues.map(({value}) => value)

      /* Make sure all expected lengths match */
      expectedTop.should.to.have.lengthOf(k)
      topkOneAtATimeKeys.should.to.have.lengthOf(expectedTop.length)
      topkAllAtOnceKeys.should.to.have.lengthOf(topkOneAtATimeKeys.length)

      /* Make sure all expected keys match */
      topkOneAtATimeKeys.should.to.deep.equal(expectedTop)
      topkAllAtOnceKeys.should.to.deep.equal(topkOneAtATimeKeys)

      /* Make sure the objects themselves match */
      topkAllAtOnceValues.should.to.deep.equal(topkOneAtATimeValues)
    })
  })

  describe('#values', () => {
    it('should produce valid TopK estimations when there are fewer than K items', () => {
      const topk = new TopK(10, 0.001, 0.999)
      for (const item of lessThanOrEqualTestCaseItems) {
        topk.add(item)
      }

      let i = 0
      let prev = {frequency: Infinity}
      for (const current of topk.values()) {
        current.should.have.all.keys('value', 'rank', 'frequency')
        current.value.should.equal(expectedTop[i])
        current.frequency.should.be.below(prev.frequency)
        current.rank.should.equal(i + 1)
        prev = current
        i++
      }

      i.should.equal(expectedTop.length)
    })

    it('should produce valid TopK estimations when there are exactly K items', () => {
      const topk = new TopK(3, 0.001, 0.999)
      for (const item of lessThanOrEqualTestCaseItems) {
        topk.add(item)
      }

      let i = 0
      let prev = {frequency: Infinity}
      for (const current of topk.values()) {
        current.should.have.all.keys('value', 'rank', 'frequency')
        current.value.should.equal(expectedTop[i])
        current.frequency.should.be.below(prev.frequency)
        current.rank.should.equal(i + 1)
        prev = current
        i++
      }

      i.should.equal(expectedTop.length)
    })

    it('should produce valid TopK estimations when there are more than K items', () => {
      const topk = new TopK(3, 0.001, 0.999)
      for (const item of moreThanTestCaseItems) {
        topk.add(item)
      }

      let i = 0
      let prev = {frequency: Infinity}
      for (const current of topk.values()) {
        current.should.have.all.keys('value', 'rank', 'frequency')
        current.value.should.equal(expectedTop[i])
        current.frequency.should.be.below(prev.frequency)
        current.rank.should.equal(i + 1)
        prev = current
        i++
      }

      i.should.equal(expectedTop.length)
    })
  })

  describe('#iterator', () => {
    it('should produce valid TopK estimations when there are fewer than K items', () => {
      const topk = new TopK(10, 0.001, 0.999)
      for (const item of lessThanOrEqualTestCaseItems) {
        topk.add(item)
      }

      let i = 0
      let prev = {frequency: Infinity}
      for (const current of topk.iterator()) {
        current.should.have.all.keys('value', 'rank', 'frequency')
        current.value.should.equal(expectedTop[i])
        current.frequency.should.be.below(prev.frequency)
        current.rank.should.equal(i + 1)
        prev = current
        i++
      }

      i.should.equal(expectedTop.length)
    })

    it('should produce valid TopK estimations when there are exactly K items', () => {
      const topk = new TopK(3, 0.001, 0.999)
      for (const item of lessThanOrEqualTestCaseItems) {
        topk.add(item)
      }

      let i = 0
      let prev = {frequency: Infinity}
      for (const current of topk.iterator()) {
        current.should.have.all.keys('value', 'rank', 'frequency')
        current.value.should.equal(expectedTop[i])
        current.frequency.should.be.below(prev.frequency)
        current.rank.should.equal(i + 1)
        prev = current
        i++
      }

      i.should.equal(expectedTop.length)
    })

    it('should produce valid estimations when there are more than K items', () => {
      const topk = new TopK(3, 0.001, 0.999)
      for (const item of moreThanTestCaseItems) {
        topk.add(item)
      }

      let i = 0
      let prev = {frequency: Infinity}
      for (const current of topk.iterator()) {
        current.should.have.all.keys('value', 'rank', 'frequency')
        current.value.should.equal(expectedTop[i])
        current.frequency.should.be.below(prev.frequency)
        current.rank.should.equal(i + 1)
        prev = current
        i++
      }

      i.should.equal(expectedTop.length)
    })
  })

  describe('#saveAsJSON', () => {
    const topk = new TopK(3, 0.001, 0.999)
    topk.add('alice')
    topk.add('bob')
    topk.add('alice')
    topk.add('carol')
    topk.add('bob')
    topk.add('alice')

    it('should export a TopK to a JSON object', () => {
      const exported = topk.saveAsJSON()

      exported.type.should.equal('TopK')
      exported._k.should.equal(topk._k)
      exported._errorRate.should.equal(topk._errorRate)
      exported._accuracy.should.equal(topk._accuracy)
      exported._seed.should.equal(topk._seed)
      // inner count min sketch
      exported._sketch.type.should.equal('CountMinSketch')
      exported._sketch._columns.should.equal(topk._sketch._columns)
      exported._sketch._rows.should.equal(topk._sketch._rows)
      exported._sketch._allSums.should.equal(topk._sketch._allSums)
      exported._sketch._seed.should.equal(topk._sketch._seed)
      exported._sketch._matrix.should.deep.equal(topk._sketch._matrix)
      // inner MinHeap
      exported._heap.should.deep.equal(topk._heap._content)
    })

    it('should create a TopK from a JSON export', () => {
      const exported = topk.saveAsJSON()
      const newSketch = TopK.fromJSON(exported)

      newSketch._k.should.equal(topk._k)
      newSketch._errorRate.should.equal(topk._errorRate)
      newSketch._accuracy.should.equal(topk._accuracy)
      newSketch._seed.should.equal(topk._seed)
      // inner count min sketch
      newSketch._sketch._columns.should.equal(topk._sketch._columns)
      newSketch._sketch._rows.should.equal(topk._sketch._rows)
      newSketch._sketch._allSums.should.equal(topk._sketch._allSums)
      newSketch._sketch._seed.should.equal(topk._sketch._seed)
      newSketch._sketch._matrix.should.deep.equal(topk._sketch._matrix)
      // inner MinHeap
      newSketch._heap._content.should.deep.equal(topk._heap._content)
    })

    it('should reject imports from invalid JSON objects', () => {
      const invalids = [
        {type: 'something'},
        {type: 'TopK'},
        {type: 'TopK', _k: 1},
        {type: 'TopK', _k: 1, _errorRate: 1},
        {type: 'TopK', _k: 1, _errorRate: 1, _accuracy: 1},
        {type: 'TopK', _k: 1, _errorRate: 1, _accuracy: 1, _content: []},
      ]

      invalids.forEach(json => {
        ;(() => TopK.fromJSON(json)).should.throw(Error)
      })
    })

    it('should update an imported TopK', () => {
      const exported = topk.saveAsJSON()
      const newSketch = TopK.fromJSON(exported)

      newSketch.add('alice')
      topk.add('alice')

      newSketch._k.should.equal(topk._k)
      newSketch._errorRate.should.equal(topk._errorRate)
      newSketch._accuracy.should.equal(topk._accuracy)
      newSketch._seed.should.equal(topk._seed)
      // inner count min sketch
      newSketch._sketch._columns.should.equal(topk._sketch._columns)
      newSketch._sketch._rows.should.equal(topk._sketch._rows)
      newSketch._sketch._allSums.should.equal(topk._sketch._allSums)
      newSketch._sketch._seed.should.equal(topk._sketch._seed)
      newSketch._sketch._matrix.should.deep.equal(topk._sketch._matrix)
      // inner MinHeap
      newSketch._heap._content.should.deep.equal(topk._heap._content)
    })
  })
})
