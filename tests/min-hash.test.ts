import {expect, test, describe} from '@jest/globals'
import MinHash from 'bloom-filters/sketch/min-hash'
import MinHashFactory from 'bloom-filters/sketch/min-hash-factory'
import range from 'lodash/range'
import intersection from 'lodash/intersection'
import union from 'lodash/union'

// Compute the exact Jaccard similairty between two sets
function jaccard(a: number[], b: number[]) {
  return intersection(a, b).length / union(a, b).length
}

let factory,
  setA,
  setB,
  maxValue = 0,
  nbHashes
try {
  const max = 10000
  setA = range(1, max)
  setB = range(1, max).map(x => (x % 2 === 0 ? x : x * 2))
  const allInOne = [...setA, ...setB]
  for (let i of allInOne) {
    if (maxValue < i) {
      maxValue = i
    }
  }
  nbHashes = 50
  factory = new MinHashFactory(nbHashes, maxValue)
} catch (error) {
  console.error(error)
  throw new Error(
    'An error occured when creating the min hash factory: ' + error
  )
}

describe('MinHash', () => {
  describe('#isEmpty', () => {
    test('should return True when the MinHash signeture is empty', () => {
      const set = factory.create()
      expect(set.isEmpty()).toEqual(true)
    })

    test('should return False when the MinHash signeture is not empty', () => {
      const set = factory.create()
      set.add(1)
      expect(set.isEmpty()).toEqual(false)
    })
  })

  describe('#add', () => {
    test('should insert values and compute the Jaccard similarity between two sets', () => {
      const firstSet = factory.create()
      const secondSet = factory.create()
      setA.forEach(value => firstSet.add(value))
      setB.forEach(value => secondSet.add(value))
      expect(firstSet.compareWith(secondSet)).toBeCloseTo(
        jaccard(setA, setB),
        0.2
      )
    })
  })

  describe('#bulkLoad', () => {
    test('should ingest a set of numbers and compute the Jaccard similarity between two sets', () => {
      const firstSet = factory.create()
      const secondSet = factory.create()
      firstSet.bulkLoad(setA)
      secondSet.bulkLoad(setB)
      expect(firstSet.compareWith(secondSet)).toBeCloseTo(
        jaccard(setA, setB),
        0.2
      )
    })
  })

  describe('#compareWith', () => {
    test('should throw an Error when we try to compare an empty MinHash with anoter MinHash', done => {
      const firstSet = factory.create()
      const secondSet = factory.create()
      secondSet.add(1)
      try {
        firstSet.compareWith(secondSet)
        done(
          new Error(
            'compareWith should throw an error when we try to compare an empty set with another MinHash'
          )
        )
      } catch {
        done()
      }
    })

    test('should throw an Error when we try to compare a MinHash with an empty MinHash', done => {
      const firstSet = factory.create()
      firstSet.add(1)
      const secondSet = factory.create()
      try {
        firstSet.compareWith(secondSet)
        done(
          new Error(
            'compareWith should throw an error when we try to compare with an empty MinHash'
          )
        )
      } catch {
        done()
      }
    })
  })

  describe('#saveAsJSON', () => {
    const mySet = factory.create()
    mySet.bulkLoad(setA)

    test('should export a MinHash to a JSON object', () => {
      const exported = mySet.saveAsJSON()
      expect(exported._nbHashes).toEqual(mySet._nbHashes)
      expect(exported._hashFunctions).toEqual(mySet._hashFunctions)
      expect(exported._signature).toEqual(mySet._signature)
    })

    test('should create a MinHash from a JSON export', () => {
      const exported = mySet.saveAsJSON()
      const newSet = MinHash.fromJSON(exported)
      expect(newSet.seed).toEqual(mySet.seed)
      expect(newSet._nbHashes).toEqual(mySet._nbHashes)
      expect(newSet._hashFunctions).toEqual(mySet._hashFunctions)
      expect(newSet._signature).toEqual(mySet._signature)
    })
  })
})
