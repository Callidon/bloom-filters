/* file : bucket-test.js
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

import Bucket from '../src/cuckoo/bucket'
import { expect, describe, test } from '@jest/globals'

describe('Bucket', () => {
    describe('#isFree', () => {
        it('should return True when the bucket as free space available', () => {
            const bucket = new Bucket(5)
            expect(bucket.isFree()).toBe(true)
            bucket.add('foo')
            expect(bucket.isFree()).toBe(true)
        })

        it('should return False when the bucket is full', () => {
            const bucket = new Bucket(1)
            bucket.add('foo')
            expect(bucket.isFree()).toBe(false)
        })
    })

    describe('#at', () => {
        it("should provides an accessor for bucket's elements", () => {
            const bucket = new Bucket(3)
            bucket.add('foo')
            bucket.add('bar')
            expect(bucket.at(0)).toEqual('foo')
            expect(bucket.at(1)).toEqual('bar')
        })
    })

    describe('#add', () => {
        it('should add an element to the bucket', () => {
            const bucket = new Bucket(5)
            bucket.add('foo')
            expect(bucket.at(0)).toEqual('foo')
            expect(bucket.length).toEqual(1)
        })

        it('should not add an element when bucket is full', () => {
            const bucket = new Bucket(1)
            bucket.add('foo')
            expect(bucket.add('bar')).toBe(false)
            expect(bucket.length).toEqual(1)
        })
    })

    describe('#remove', () => {
        it('should remove an element from the bucket', () => {
            const bucket = new Bucket(5)
            bucket.add('foo')
            expect(bucket.remove('foo')).toBe(true)
            expect(bucket.length).toEqual(0)
        })

        it('should remove an element without altering the others', () => {
            const bucket = new Bucket(5)
            bucket.add('foo')
            bucket.add('bar')
            bucket.add('moo')
            expect(bucket.remove('bar')).toBe(true)
            expect(bucket._elements.indexOf('foo')).toBeGreaterThan(-1)
            expect(bucket._elements.indexOf('moo')).toBeGreaterThan(-1)
            expect(bucket.length).toEqual(2)
        })

        it('should fail to remove elements that are not in the bucket', () => {
            const bucket = new Bucket(5)
            bucket.add('foo')
            expect(bucket.remove('bar')).toBe(false)
            expect(bucket.length).toEqual(1)
        })
    })

    describe('#has', () => {
        it('should return True when the element is in the bucket', () => {
            const bucket = new Bucket(5)
            bucket.add('foo')
            expect(bucket.has('foo')).toBe(true)
        })

        it('should return False when the element is not in the bucket', () => {
            const bucket = new Bucket(5)
            bucket.add('foo')
            expect(bucket.has('moo')).toBe(false)
        })
    })

    describe('#swapRandom', () => {
        it('should randomly swap an element from the inside of the bucket with one from the outside', () => {
            const bucket = new Bucket(5)
            const values = ['foo', 'bar', 'moo']
            values.forEach(value => bucket.add(value))
            const expected = 'boo'
            expect(values).toContain(bucket.swapRandom(expected))
            expect(bucket.has(expected)).toBe(true)
        })
    })

    describe('#equals', () => {
        it('should return True when two buckets are equals', () => {
            const b1 = new Bucket(5)
            const b2 = new Bucket(5)
            const values = ['foo', 'bar', 'moo']
            values.forEach(value => {
                b1.add(value)
                b2.add(value)
            })

            expect(b1.equals(b2)).toBe(true)
        })

        it('should return False when two buckets are not equals due to their size', () => {
            const b1 = new Bucket(5)
            const b2 = new Bucket(3)

            expect(b1.equals(b2)).toBe(false)
        })

        it('should return False when two buckets are not equals due to their length', () => {
            const b1 = new Bucket(5)
            const b2 = new Bucket(5)
            b1.add('foo')
            b1.add('bar')
            b2.add('moo')

            expect(b1.equals(b2)).toBe(false)
        })

        it('should return False when two buckets are not equals due to their content', () => {
            const b1 = new Bucket(5)
            const b2 = new Bucket(5)
            b1.add('foo')
            b1.add('bar')
            b2.add('foo')
            b2.add('moo')

            expect(b1.equals(b2)).toBe(false)
        })
    })

    describe('#saveAsJSON', () => {
        const bucket = new Bucket(5)
        const values = ['foo', 'bar', 'moo']
        values.forEach(value => bucket.add(value))

        it('should export a bucket to a JSON object', () => {
            const exported = bucket.saveAsJSON()
            expect(exported._size).toEqual(bucket.size)
            expect(exported._elements).toEqual(bucket._elements)
        })

        it('should create a bucket from a JSON export', () => {
            const exported = bucket.saveAsJSON()
            const newBucket = Bucket.fromJSON(exported)
            expect(newBucket.size).toEqual(bucket.size)
            expect(newBucket.length).toEqual(bucket.length)
            expect(newBucket._elements).toEqual(bucket._elements)
        })
    })
})
