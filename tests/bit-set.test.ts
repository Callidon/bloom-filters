import {expect, test} from '@jest/globals'
import BitSet from 'bloom-filters/bloom/bit-set'

test('is initially clear', () => {
  const set = new BitSet(50)
  expect(set.size).toEqual(56)
  for (let i = 0; i < set.size; i++) {
    expect(set.has(i)).toEqual(false)
  }
})

test('#add', () => {
  const set = new BitSet(50)
  expect(set.size).toEqual(56)
  for (let i = 0; i < set.size; i++) {
    expect(set.has(i)).toEqual(false)
    set.add(i)
    expect(set.has(i)).toEqual(true)
  }
})

test('#max: finds the high bit', () => {
  const set = new BitSet(150)
  expect(set.size).toEqual(152)
  for (let i = 0; i < set.size; i++) {
    set.add(i)
    expect(set.max()).toEqual(i)
  }
})

test('imports what it exports', () => {
  const set = new BitSet(50)
  for (let i = 0; i < set.size; i += 3) {
    // 3 is relatively prime to 8, so should hit all edge cases
    set.add(i)
  }
  const exported = set.export()
  const imported = BitSet.import(exported)
  expect(imported.size).toEqual(set.size)
  for (let i = 0; i < set.size; i++) {
    const expected = i % 3 === 0
    expect(set.has(i)).toEqual(expected)
  }
})

test('Throws an Error on bad data', () => {
  const data = [{size: 1}, {content: 'Ag=='}, {size: 'cow', content: 'Ag=='}]
  data.forEach((json: any) => () => {
    expect(BitSet.import(json)).toThrowError(Error)
  })
})

test('returns true on identical size and data', () => {
  const a = new BitSet(50)
  const b = new BitSet(50)
  expect(a.equals(b)).toEqual(true)
  for (let i = 0; i < a.size; i += 3) {
    // 3 is relatively prime to 8, so should hit all edge cases
    a.add(i)
    b.add(i)
    expect(a.equals(b)).toEqual(true)
  }
})

test('returns false on different size', () => {
  expect(new BitSet(50).equals(new BitSet(150))).toEqual(false)
})

test('returns false on different data', () => {
  let a = new BitSet(50)
  const b = new BitSet(50)
  a.add(3)
  expect(a.equals(b)).toEqual(false)
  a = new BitSet(50)
  expect(a.equals(b)).toEqual(true)
  a.add(49)
  expect(a.equals(b)).toEqual(false)
})

test('counts the number of bits', () => {
  const set = new BitSet(50)
  let expectedCount = 0
  expect(set.bitCount()).toEqual(expectedCount)
  for (let i = 0; i < set.size; i += 3) {
    set.add(i)
    expectedCount++
    expect(set.bitCount()).toEqual(expectedCount)
  }
})
