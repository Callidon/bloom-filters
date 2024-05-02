import './bootstrap'
import { BitSet } from '../src/api'
import { expect, describe, test } from '@jest/globals'

describe('BitSet', () => {
    test('is initially clear', () => {
        const set = new BitSet(50)
        expect(set.size).toEqual(56)
        for (let i = 0; i < set.size; i++) {
            expect(set.has(i)).toBe(false)
        }
    })

    test('#add', () => {
        const set = new BitSet(50)
        expect(set.size).toEqual(56)
        for (let i = 0; i < set.size; i++) {
            expect(set.has(i)).toBe(false)
            set.add(i)
            expect(set.has(i)).toBe(true)
        }
    })

    describe('#max', () => {
        test('finds the high bit', () => {
            const set = new BitSet(150)
            expect(set.size).toEqual(152)
            for (let i = 0; i < set.size; i++) {
                set.add(i)
                expect(set.max()).toEqual(i)
            }
        })
    })

    describe('#import, #export', () => {
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

        describe('#import', () => {
            test('Throws an Error on bad data', () => {
                ;[
                    { size: 1 },
                    { content: 'Ag==' },
                    { size: 'cow', content: 'Ag==' },
                ].forEach((json: any) => {
                    expect(() => BitSet.import(json)).toThrow(Error)
                })
            })
        })
    })

    describe('#equals', () => {
        test('returns true on identical size and data', () => {
            const a = new BitSet(50)
            const b = new BitSet(50)
            expect(a.equals(b)).toBe(true)
            for (let i = 0; i < a.size; i += 3) {
                // 3 is relatively prime to 8, so should hit all edge cases
                a.add(i)
                b.add(i)
                expect(a.equals(b)).toBe(true)
            }
        })

        test('returns false on different size', () => {
            expect(new BitSet(50).equals(new BitSet(150))).toBe(false)
        })

        test('returns false on different data', () => {
            let a = new BitSet(50)
            const b = new BitSet(50)
            a.add(3)
            expect(a.equals(b)).toBe(false)
            a = new BitSet(50)
            expect(a.equals(b)).toBe(true)
            a.add(49)
            expect(a.equals(b)).toBe(false)
        })
    })

    describe('#bitCount', () => {
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
    })
})
