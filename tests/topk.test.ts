import {expect, test, describe} from '@jest/globals'
import TopK, {TopkElement} from 'bloom-filters/sketch/topk'
import {exportBigInt, getDefaultSeed} from 'bloom-filters/utils'

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
    test('should produce equivalent TopK estimations when using count parameter', () => {
      const k = 3
      const errorRate = 0.001
      const accuracy = 0.999
      const freqTable: Record<string, number> = {}

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
        (acc: Record<string, number>, curr) => {
          if (!Object.hasOwnProperty.call(acc, curr)) {
            acc[`${curr}`] = 1
          } else {
            ++acc[`${curr}`]
          }

          return acc
        },
        {}
      )
      expect(freqTable).toEqual(expectedFreqTable)

      /* Build a version of TopK using the frequency as count */
      const topkAllAtOnce = new TopK(k, errorRate, accuracy)
      for (const [item, freq] of Object.entries(freqTable)) {
        topkAllAtOnce.add(item, freq as number)
      }

      const topkOneAtATimeValues = topkOneAtATime.values()
      const topkOneAtATimeKeys = topkOneAtATimeValues.map(({value}) => value)
      const topkAllAtOnceValues = topkAllAtOnce.values()
      const topkAllAtOnceKeys = topkAllAtOnceValues.map(({value}) => value)

      /* Make sure all expected lengths match */
      expect(expectedTop.length).toEqual(k)
      expect(topkOneAtATimeKeys.length).toEqual(expectedTop.length)
      expect(topkAllAtOnceKeys.length).toEqual(topkOneAtATimeKeys.length)

      /* Make sure all expected keys match */
      expect(topkOneAtATimeKeys).toEqual(expectedTop)
      expect(topkAllAtOnceKeys).toEqual(topkOneAtATimeKeys)

      /* Make sure the objects themselves match */
      expect(topkAllAtOnceValues).toEqual(topkOneAtATimeValues)
    })
  })

  describe('#values', () => {
    test('should produce valid TopK estimations when there are fewer than K items', () => {
      const topk = new TopK(10, 0.001, 0.999)
      for (const item of lessThanOrEqualTestCaseItems) {
        topk.add(item)
      }

      let i = 0
      let prev: TopkElement = {frequency: Infinity, value: '', rank: 0}
      for (const current of topk.values()) {
        expect([...Object.keys(current)].sort()).toEqual(
          ['value', 'rank', 'frequency'].sort()
        )
        expect(current.value).toEqual(expectedTop[i])
        expect(current.frequency).toBeLessThan(prev.frequency)
        expect(current.rank).toEqual(i + 1)
        prev = current
        i++
      }

      expect(i).toEqual(expectedTop.length)
    })

    test('should produce valid TopK estimations when there are exactly K items', () => {
      const topk = new TopK(3, 0.001, 0.999)
      for (const item of lessThanOrEqualTestCaseItems) {
        topk.add(item)
      }

      let i = 0
      let prev: TopkElement = {frequency: Infinity, value: '', rank: 0}
      for (const current of topk.values()) {
        expect([...Object.keys(current)].sort()).toEqual(
          ['value', 'rank', 'frequency'].sort()
        )
        expect(current.value).toEqual(expectedTop[i])
        expect(current.frequency).toBeLessThan(prev.frequency)
        expect(current.rank).toEqual(i + 1)
        prev = current
        i++
      }

      expect(i).toEqual(expectedTop.length)
    })

    test('should produce valid TopK estimations when there are more than K items', () => {
      const topk = new TopK(3, 0.001, 0.999)
      for (const item of moreThanTestCaseItems) {
        topk.add(item)
      }

      let i = 0
      let prev: TopkElement = {frequency: Infinity, value: '', rank: 0}
      for (const current of topk.values()) {
        expect([...Object.keys(current)].sort()).toEqual(
          ['value', 'rank', 'frequency'].sort()
        )
        expect(current.value).toEqual(expectedTop[i])
        expect(current.frequency).toBeLessThan(prev.frequency)
        expect(current.rank).toEqual(i + 1)
        prev = current
        i++
      }

      expect(i).toEqual(expectedTop.length)
    })
  })

  describe('#iterator', () => {
    test('should produce valid TopK estimations when there are fewer than K items', () => {
      const topk = new TopK(10, 0.001, 0.999)
      for (const item of lessThanOrEqualTestCaseItems) {
        topk.add(item)
      }

      let i = 0
      let prev: TopkElement = {frequency: Infinity, value: '', rank: 0}
      const it = topk.iterator()
      let current: TopkElement
      while ((current = it.next().value)) {
        expect([...Object.keys(current)].sort()).toEqual(
          ['value', 'rank', 'frequency'].sort()
        )
        expect(current.value).toEqual(expectedTop[i])
        expect(current.frequency).toBeLessThan(prev.frequency)
        expect(current.rank).toEqual(i + 1)
        prev = current
        i++
      }
      expect(i).toEqual(expectedTop.length)
    })

    test('should produce valid TopK estimations when there are exactly K items', () => {
      const topk = new TopK(3, 0.001, 0.999)
      for (const item of lessThanOrEqualTestCaseItems) {
        topk.add(item)
      }

      let i = 0
      let prev: TopkElement = {frequency: Infinity, value: '', rank: 0}
      const it = topk.iterator()
      let current: TopkElement
      while ((current = it.next().value)) {
        expect([...Object.keys(current)].sort()).toEqual(
          ['value', 'rank', 'frequency'].sort()
        )
        expect(current.value).toEqual(expectedTop[i])
        expect(current.frequency).toBeLessThan(prev.frequency)
        expect(current.rank).toEqual(i + 1)
        prev = current
        i++
      }

      expect(i).toEqual(expectedTop.length)
    })

    test('should produce valid estimations when there are more than K items', () => {
      const topk = new TopK(3, 0.001, 0.999)
      for (const item of moreThanTestCaseItems) {
        topk.add(item)
      }

      let i = 0
      let prev: TopkElement = {frequency: Infinity, value: '', rank: 0}
      const it = topk.iterator()
      let current: TopkElement
      while ((current = it.next().value)) {
        expect([...Object.keys(current)].sort()).toEqual(
          ['value', 'rank', 'frequency'].sort()
        )
        expect(current.value).toEqual(expectedTop[i])
        expect(current.frequency).toBeLessThan(prev.frequency)
        expect(current.rank).toEqual(i + 1)
        prev = current
        i++
      }

      expect(i).toEqual(expectedTop.length)
    })
  })

  describe('#seed', () => {
    test('should declare the same seed for the internal sketch', () => {
      let topk = new TopK(3, 0.001, 0.999)
      expect(topk.seed).toEqual(getDefaultSeed())
      expect(topk._sketch.seed).toEqual(getDefaultSeed())
      topk = new TopK(3, 0.001, 0.999, 1n)
      expect(topk.seed).toEqual(1n)
      expect(topk._sketch.seed).toEqual(1n)
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

    test('should export a TopK to a JSON object', () => {
      const exported = topk.saveAsJSON()
      expect(exported._k).toEqual(topk._k)
      expect(exported._errorRate).toEqual(topk._errorRate)
      expect(exported._accuracy).toEqual(topk._accuracy)
      expect(exported._seed).toEqual(exportBigInt(topk._seed))
      // inner count min sketch
      expect(exported._sketch._columns).toEqual(topk._sketch._columns)
      expect(exported._sketch._rows).toEqual(topk._sketch._rows)
      expect(exported._sketch._allSums).toEqual(topk._sketch._allSums)
      expect(exported._sketch._seed).toEqual(exportBigInt(topk._sketch._seed))
      expect(exported._sketch._matrix).toEqual(topk._sketch._matrix)
      // inner MinHeap
      expect(exported._heap._content).toEqual(topk._heap._content)
    })

    test('should create a TopK from a JSON export', () => {
      const exported = topk.saveAsJSON()
      const newSketch = TopK.fromJSON(exported)

      expect(newSketch._k).toEqual(topk._k)
      expect(newSketch._errorRate).toEqual(topk._errorRate)
      expect(newSketch._accuracy).toEqual(topk._accuracy)
      expect(newSketch._seed).toEqual(topk._seed)
      // inner count min sketch
      expect(newSketch._sketch._columns).toEqual(topk._sketch._columns)
      expect(newSketch._sketch._rows).toEqual(topk._sketch._rows)
      expect(newSketch._sketch._allSums).toEqual(topk._sketch._allSums)
      expect(newSketch._sketch._seed).toEqual(topk._sketch._seed)
      expect(newSketch._sketch._matrix).toEqual(topk._sketch._matrix)
      // inner MinHeap
      expect(newSketch._heap._content).toEqual(topk._heap._content)
    })

    test('should update an imported TopK', () => {
      const exported = topk.saveAsJSON()
      const newSketch = TopK.fromJSON(exported)

      newSketch.add('alice')
      topk.add('alice')

      expect(newSketch._k).toEqual(topk._k)
      expect(newSketch._errorRate).toEqual(topk._errorRate)
      expect(newSketch._accuracy).toEqual(topk._accuracy)
      expect(newSketch._seed).toEqual(topk._seed)
      // inner count min sketch
      expect(newSketch._sketch._columns).toEqual(topk._sketch._columns)
      expect(newSketch._sketch._rows).toEqual(topk._sketch._rows)
      expect(newSketch._sketch._allSums).toEqual(topk._sketch._allSums)
      expect(newSketch._sketch._seed).toEqual(topk._sketch._seed)
      expect(newSketch._sketch._matrix).toEqual(topk._sketch._matrix)
      // inner MinHeap
      expect(newSketch._heap._content).toEqual(topk._heap._content)
    })
  })
})
