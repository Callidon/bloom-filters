import { expect, test } from '@jest/globals'
import { XorFilter, XorSize } from '../src/index.mjs'

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
