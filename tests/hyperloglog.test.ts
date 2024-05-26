import { expect, test } from '@jest/globals'
import { HyperLogLog } from '../src/index'
import Global from './global'

const seed = Global.seed(__filename)

test('should support update and cardinality estimations (count) operations', () => {
    const m = 2 ** 8
    const n = 10e4
    const sketch = new HyperLogLog(m)
    sketch.seed = seed
    // populate the sketch with some values
    for (let i = 0; i < n; i++) {
        sketch.update(i.toString())
    }

    // Citation:
    // "Let σ ≈ 1.04/√m represent the standard error; the estimates provided by HYPERLOGLOG
    // are expected to be within σ, 2σ, 3σ of the exact count in respectively 65%, 95%, 99% of all
    // the cases"
    const exact_count = sketch.count()
    const relative_error = sketch.relative_error()

    let error: unknown
    const relative_errors = [relative_error, 2 * relative_error, 3 * relative_error]

    for (const relative_err of relative_errors) {
        try {
            expect(n - exact_count).toBeLessThan(n * relative_err)
            error = false
            break
        } catch (e: unknown) {
            error = e
        }
    }

    if (error) {
        throw new Error(
            `should be withing σ, 2σ or 3σ: ${relative_errors.map(e => e * n).toString()}`,
        )
    }
})
test('should performs the union of two HyperLogLog sketches', () => {
    const first = new HyperLogLog(2 ** 4)
    first.seed = seed
    const second = new HyperLogLog(2 ** 4)
    second.seed = seed
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
    const first = new HyperLogLog(2 ** 4)
    first.seed = seed
    const second = new HyperLogLog(2 ** 5)
    second.seed = seed
    expect(() => first.merge(second)).toThrow(Error)
})

function buildHyperloglog() {
    const sketch = new HyperLogLog(2 ** 4)
    sketch.seed = seed
    sketch.update('alice')
    sketch.update('bob')
    return sketch
}

test('should export an HyperLogLog to a JSON object', () => {
    const sketch = buildHyperloglog()
    const exported = sketch.saveAsJSON()
    expect(exported._m).toEqual(sketch._m)
    expect(exported._b).toEqual(sketch._b)
    expect(exported._correctionBias).toEqual(sketch._correctionBias)
    expect(exported._registers).toEqual(sketch._registers)
})

test('should create an HyperLogLog from a JSON export', () => {
    const sketch = buildHyperloglog()
    const exported = sketch.saveAsJSON()
    const newFilter = HyperLogLog.fromJSON(exported)
    expect(newFilter.seed).toEqual(sketch.seed)
    expect(newFilter._m).toEqual(sketch._m)
    expect(newFilter._b).toEqual(sketch._b)
    expect(newFilter._correctionBias).toEqual(sketch._correctionBias)
    expect(newFilter._registers).toEqual(sketch._registers)
})

test('issue#(https://github.com/Callidon/bloom-filters/issues/69)', () => {
    // create a new HyperLogLog with 100 registers
    const sketch = new HyperLogLog(128)
    sketch.seed = seed
    // push 10000 distinct elements
    const n = 2 ** 14
    for (let i = 0; i < n; i++) {
        sketch.update(i.toString())
    }
    // count occurrences
    expect(sketch.relative_error()).toEqual(1.04 / Math.sqrt(128))
    expect(n - sketch.count()).toBeLessThan(n * sketch.relative_error() * 3)
})
