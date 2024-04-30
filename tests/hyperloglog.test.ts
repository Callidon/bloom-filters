/* file : hyperloglog-test.js
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
const { HyperLogLog } = require('../dist/api.js')

describe('HyperLogLog', () => {
    describe('#update', () => {
        test('should support update and cardinality estimations (count) operations', () => {
            const nbDistinct = 100
            const sketch = new HyperLogLog(110)
            // populate the sketch with some values
            for (let i = 0; i < 10e3; i++) {
                sketch.update(`${i % nbDistinct}`)
            }
            expect(sketch.count(true)).toBeCloseTo(
                nbDistinct,
                nbDistinct * sketch.accuracy()
            )
        })
    })

    describe('#merge', () => {
        test('should peforms the union of two HyperLogLog sketches', () => {
            const first = new HyperLogLog(10)
            const second = new HyperLogLog(10)
            first.update('alice')
            first.update('bob')
            second.update('carol')
            second.update('daniel')

            const merged = first.merge(second)
            expect(merged.nbRegisters).toEqual(first.nbRegisters)
            for (let i = 0; i < merged.nbRegisters; i++) {
                expect(merged._registers[i]).toEqual(
                    Math.max(first._registers[i], second._registers[i])
                )
            }
        })

        test('should reject the union of two sketches with different number of registers', done => {
            const first = new HyperLogLog(10)
            const second = new HyperLogLog(20)
            try {
                first.merge(second)
                done(
                    new Error(
                        'The two sketches cannot be merged, as they have different number of registers'
                    )
                )
            } catch (error) {
                done()
            }
        })
    })

    describe('#equals', () => {
        test('should returns True when two HyperLogLog sketches are equals', () => {
            const first = new HyperLogLog(10)
            const second = new HyperLogLog(10)
            first.update('alice')
            first.update('bob')
            second.update('alice')
            second.update('bob')
            expect(first.equals(second)).toBe(true)
        })

        test('should returns False when two sketches have different number of registers', () => {
            const first = new HyperLogLog(10)
            const second = new HyperLogLog(11)
            expect(first.equals(second)).toBe(false)
        })

        test('should returns False when two sketches have different content in their registers', () => {
            const first = new HyperLogLog(10)
            const second = new HyperLogLog(11)
            first.update('alice')
            first.update('bob')
            second.update('carol')
            second.update('daniel')
            expect(first.equals(second)).toBe(false)
        })
    })

    describe('#saveAsJSON', () => {
        const sketch = new HyperLogLog(10)
        sketch.update('alice')
        sketch.update('bob')

        test('should export an HyperLogLog to a JSON object', () => {
            const exported = sketch.saveAsJSON()
            expect(exported._nbRegisters).toEqual(sketch._nbRegisters)
            expect(exported._nbBytesPerHash).toEqual(sketch._nbBytesPerHash)
            expect(exported._correctionBias).toEqual(sketch._correctionBias)
            expect(exported._registers).toEqual(sketch._registers)
        })

        test('should create an HyperLogLog from a JSON export', () => {
            const exported = sketch.saveAsJSON()
            const newFilter = HyperLogLog.fromJSON(exported)
            expect(newFilter.seed).toEqual(sketch.seed)
            expect(newFilter._nbRegisters).toEqual(sketch._nbRegisters)
            expect(newFilter._nbBytesPerHash).toEqual(sketch._nbBytesPerHash)
            expect(newFilter._correctionBias).toEqual(sketch._correctionBias)
            expect(newFilter._registers).toEqual(sketch._registers)
        })
    })
})
