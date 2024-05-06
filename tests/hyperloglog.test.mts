import { expect, test } from '@jest/globals'
import { HyperLogLog } from '../src/index.mjs'

test('should support update and cardinality estimations (count) operations', () => {
    const nbDistinct = 100
    const sketch = new HyperLogLog(110)
    // populate the sketch with some values
    for (let i = 0; i < 10e3; i++) {
        sketch.update((i % nbDistinct).toString())
    }
    expect(sketch.count(true)).toBeCloseTo(nbDistinct, nbDistinct * sketch.accuracy())
})
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
        expect(merged._registers[i]).toEqual(Math.max(first._registers[i], second._registers[i]))
    }
})

test('should reject the union of two sketches with different number of registers', () => {
    const first = new HyperLogLog(10)
    const second = new HyperLogLog(20)
    expect(() => first.merge(second)).toThrow(Error)
})

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

function buildHyperloglog() {
    const sketch = new HyperLogLog(10)
    sketch.update('alice')
    sketch.update('bob')
    return sketch
}

test('should export an HyperLogLog to a JSON object', () => {
    const sketch = buildHyperloglog()
    const exported = sketch.saveAsJSON()
    expect(exported._nbRegisters).toEqual(sketch._nbRegisters)
    expect(exported._nbBytesPerHash).toEqual(sketch._nbBytesPerHash)
    expect(exported._correctionBias).toEqual(sketch._correctionBias)
    expect(exported._registers).toEqual(sketch._registers)
})

test('should create an HyperLogLog from a JSON export', () => {
    const sketch = buildHyperloglog()
    const exported = sketch.saveAsJSON()
    const newFilter = HyperLogLog.fromJSON(exported)
    expect(newFilter.seed).toEqual(sketch.seed)
    expect(newFilter._nbRegisters).toEqual(sketch._nbRegisters)
    expect(newFilter._nbBytesPerHash).toEqual(sketch._nbBytesPerHash)
    expect(newFilter._correctionBias).toEqual(sketch._correctionBias)
    expect(newFilter._registers).toEqual(sketch._registers)
})
