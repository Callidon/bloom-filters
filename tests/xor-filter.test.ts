/* file : bloom-filter-test.js
MIT License

Copyright (c) 2017 Thomas Minier & Arnaud Grall

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
import { XorFilter } from '../src/api'
import { XorSize } from '../src/bloom/xor-filter'

describe('XorFilter', () => {
    const elements = ['1']
    const count = 1000
    const sizes: XorSize[] = [8, 16]
    sizes.forEach(size => {
        test(`[XOR/${size.toString()}] should create a xor filter correctly (array of ${elements.length.toString()} element(s))`, () => {
            const filter = XorFilter.create(elements, size)
            expect(filter.has(elements[0])).toBe(true)
            expect(filter.has('2')).toBe(false)
        })
        test(`[XOR/${size.toString()}] should create a xor filter correctly for ${count.toString()} elements`, () => {
            const a: string[] = []
            const format = (e: number) => `hash:${e.toString()}`
            for (let i = 0; i < count; i++) {
                a.push(String(i))
            }
            const filter = XorFilter.create(a, size)
            let truthy = 0,
                falsy = 0
            for (let i = 0; i < count; i++) {
                if (filter.has(format(i))) {
                    truthy++
                } else {
                    falsy++
                }
            }
            let prob = truthy / count
            expect(prob).toBeGreaterThan(0.99)
            ;(falsy = 0), (truthy = 0)
            for (let i = 0; i < count; i++) {
                if (filter.has(format(count * 10 + i))) {
                    truthy++
                } else {
                    falsy++
                }
            }
            prob = falsy / count
            expect(prob).toBeGreaterThan(0.99)
        })
        test(`[XOR/${size.toString()}] exported filter should be importable`, () => {
            const filter = XorFilter.create(['alice'])
            const json = filter.saveAsJSON()
            const newFilter = XorFilter.fromJSON(json)
            expect(filter.equals(newFilter)).toBe(true)
            expect(filter.seed).toEqual(newFilter.seed)
        })
    })
})
