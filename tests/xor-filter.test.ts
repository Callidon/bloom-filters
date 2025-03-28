import {expect, test, describe} from '@jest/globals'
import XorFilter, {XorSize} from 'bloom-filters/bloom/xor-filter'

describe('XorFilter', () => {
  const elements = ['1']
  const count = 1000
  const sizes: number[] = [8, 16, 32, 64]
  sizes.forEach(size => {
    test(`[XOR/${size}] should create a xor filter correctly (array of ${elements.length} element(s))`, () => {
      const filter = XorFilter.create(elements, size as XorSize)
      expect(filter.has('1')).toBe(true)
      expect(filter.has('2')).toBe(false)
      expect(filter._filter.some(e => e !== 0n)).toBe(true)
    })
    test(`[XOR/${size}] should create a xor filter correctly for ${count} elements`, () => {
      const a: string[] = []
      const format = (e: number) => `hash:${e}`
      for (let i = 0; i < count; i++) {
        a.push(format(i))
      }
      const filter = XorFilter.create(a, size as XorSize)
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
    test(`[XOR/${size}] exported filter should be importable`, () => {
      const filter = XorFilter.create(['alice'])
      const json = filter.saveAsJSON()
      const newFilter = XorFilter.fromJSON(json)
      expect(filter._filter.every((b, i) => newFilter._filter[i] === b)).toBe(
        true
      )
      expect(filter.seed).toEqual(newFilter.seed)
    })
  })
})
