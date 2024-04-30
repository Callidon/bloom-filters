/* file : min-hash-test.js
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

import { expect, describe, test } from '@jest/globals'
import { MinHashFactory, MinHash } from '../src/api'
import { range, intersection, union } from 'lodash'

// Compute the exact Jaccard similairty between two sets
function jaccard(a, b) {
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
    for (const i of allInOne) {
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
            expect(set.isEmpty()).toBe(true)
        })

        test('should return False when the MinHash signeture is not empty', () => {
            const set = factory.create()
            set.add(1)
            expect(set.isEmpty()).toBe(false)
        })
    })

    describe('#add', () => {
        test('should insert values and compute the Jaccard similarity between two sets', () => {
            const firstSet = factory.create()
            const secondSet = factory.create()
            setA.forEach(value => {
                firstSet.add(value)
            })
            setB.forEach(value => {
                secondSet.add(value)
            })
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
            } catch (error) {
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
            } catch (error) {
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