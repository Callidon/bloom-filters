import {expect, test, describe} from '@jest/globals'
import HyperLogLog from 'bloom-filters/sketch/hyperloglog'

describe('HyperLogLog', () => {
  describe('#update', () => {
    test('should support update and cardinality estimations (count) operations', () => {
      const m = 2 ** 8
      const n = 10e4
      const sketch = new HyperLogLog(m)
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

      let error
      const relative_errors = [
        relative_error,
        2 * relative_error,
        3 * relative_error,
      ]

      for (const relative_err of relative_errors) {
        try {
          expect(Math.abs(n - exact_count)).toBeLessThan(n * relative_err)
          error = false
          break
        } catch (e) {
          error = e
        }
      }

      if (error) {
        throw new Error(
          `should be withing σ, 2σ or 3σ: ${relative_errors
            .map(e => e * n)
            .toString()}: ${error.toString()}`
        )
      }
    })
  })

  describe('#merge', () => {
    test('should peforms the union of two HyperLogLog sketches', () => {
      const first = new HyperLogLog(8)
      const second = new HyperLogLog(8)
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
      const first = new HyperLogLog(8)
      const second = new HyperLogLog(32)
      try {
        first.merge(second)
        done(
          new Error(
            'The two sketches cannot be merged, as they have different number of registers'
          )
        )
      } catch {
        done()
      }
    })
  })

  describe('#equals', () => {
    test('should returns True when two HyperLogLog sketches are equals', () => {
      const first = new HyperLogLog(8)
      const second = new HyperLogLog(8)
      first.update('alice')
      first.update('bob')
      second.update('alice')
      second.update('bob')
      expect(first.saveAsJSON()).toEqual(second.saveAsJSON())
    })

    test('should returns False when two sketches have different number of registers', () => {
      const first = new HyperLogLog(8)
      const second = new HyperLogLog(16)
      expect(first.saveAsJSON()).not.toEqual(second.saveAsJSON())
    })

    test('should returns False when two sketches have different content in their registers', () => {
      const first = new HyperLogLog(8)
      const second = new HyperLogLog(16)
      first.update('alice')
      first.update('bob')
      second.update('carol')
      second.update('daniel')
      expect(first.saveAsJSON()).not.toEqual(second.saveAsJSON())
    })
  })

  describe('#saveAsJSON', () => {
    const sketch = new HyperLogLog(8)
    sketch.update('alice')
    sketch.update('bob')

    test('should export an HyperLogLog to a JSON object', () => {
      const exported = sketch.saveAsJSON()
      expect(exported._m).toEqual(sketch._m)
      expect(exported._b).toEqual(sketch._b)
      expect(exported._correctionBias).toEqual(sketch._correctionBias)
      expect(exported._registers).toEqual(sketch._registers)
    })

    test('should create an HyperLogLog from a JSON export', () => {
      const exported = sketch.saveAsJSON()
      const newFilter = HyperLogLog.fromJSON(exported)
      expect(newFilter.seed).toEqual(sketch.seed)
      expect(exported._m).toEqual(sketch._m)
      expect(exported._b).toEqual(sketch._b)
      expect(newFilter._correctionBias).toEqual(sketch._correctionBias)
      expect(newFilter._registers).toEqual(sketch._registers)
    })
  })
})
