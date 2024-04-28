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

require('chai').should()
const Bucket = require('../dist/cuckoo/bucket.js').default

describe('Bucket', () => {
  describe('#isFree', () => {
    it('should return True when the bucket as free space available', () => {
      const bucket = new Bucket(5)
      bucket.isFree().should.equal(true)
      bucket.add('foo')
      bucket.isFree().should.equal(true)
    })

    it('should return False when the bucket is full', () => {
      const bucket = new Bucket(1)
      bucket.add('foo')
      bucket.isFree().should.equal(false)
    })
  })

  describe('#at', () => {
    it("should provides an accessor for bucket's elements", () => {
      const bucket = new Bucket(3)
      bucket.add('foo')
      bucket.add('bar')
      bucket.at(0).should.equal('foo')
      bucket.at(1).should.equal('bar')
    })
  })

  describe('#add', () => {
    it('should add an element to the bucket', () => {
      const bucket = new Bucket(5)
      bucket.add('foo')
      bucket.at(0).should.equal('foo')
      bucket.length.should.equal(1)
    })

    it('should not add an element when bucket is full', () => {
      const bucket = new Bucket(1)
      bucket.add('foo')
      bucket.add('bar').should.equal(false)
      bucket.length.should.equal(1)
    })
  })

  describe('#remove', () => {
    it('should remove an element from the bucket', () => {
      const bucket = new Bucket(5)
      bucket.add('foo')
      bucket.remove('foo').should.equal(true)
      bucket.length.should.equal(0)
    })

    it('should remove an element without altering the others', () => {
      const bucket = new Bucket(5)
      bucket.add('foo')
      bucket.add('bar')
      bucket.add('moo')
      bucket.remove('bar').should.equal(true)
      bucket._elements.indexOf('foo').should.be.greaterThan(-1)
      bucket._elements.indexOf('moo').should.be.greaterThan(-1)
      bucket.length.should.equal(2)
    })

    it('should fail to remove elements that are not in the bucket', () => {
      const bucket = new Bucket(5)
      bucket.add('foo')
      bucket.remove('bar').should.equal(false)
      bucket.length.should.equal(1)
    })
  })

  describe('#has', () => {
    it('should return True when the element is in the bucket', () => {
      const bucket = new Bucket(5)
      bucket.add('foo')
      bucket.has('foo').should.equal(true)
    })

    it('should return False when the element is not in the bucket', () => {
      const bucket = new Bucket(5)
      bucket.add('foo')
      bucket.has('moo').should.equal(false)
    })
  })

  describe('#swapRandom', () => {
    it('should randomly swap an element from the inside of the bucket with one from the outside', () => {
      const bucket = new Bucket(5)
      const values = ['foo', 'bar', 'moo']
      values.forEach(value => bucket.add(value))
      const expected = 'boo'
      bucket.swapRandom(expected).should.be.oneOf(values)
      bucket.has(expected).should.equal(true)
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

      b1.equals(b2).should.equal(true)
    })

    it('should return False when two buckets are not equals due to their size', () => {
      const b1 = new Bucket(5)
      const b2 = new Bucket(3)

      b1.equals(b2).should.equal(false)
    })

    it('should return False when two buckets are not equals due to their length', () => {
      const b1 = new Bucket(5)
      const b2 = new Bucket(5)
      b1.add('foo')
      b1.add('bar')
      b2.add('moo')

      b1.equals(b2).should.equal(false)
    })

    it('should return False when two buckets are not equals due to their content', () => {
      const b1 = new Bucket(5)
      const b2 = new Bucket(5)
      b1.add('foo')
      b1.add('bar')
      b2.add('foo')
      b2.add('moo')

      b1.equals(b2).should.equal(false)
    })
  })

  describe('#saveAsJSON', () => {
    const bucket = new Bucket(5)
    const values = ['foo', 'bar', 'moo']
    values.forEach(value => bucket.add(value))

    it('should export a bucket to a JSON object', () => {
      const exported = bucket.saveAsJSON()
      exported.type.should.equal('Bucket')
      exported._size.should.equal(bucket.size)
      exported._elements.should.deep.equal(bucket._elements)
    })

    it('should create a bucket from a JSON export', () => {
      const exported = bucket.saveAsJSON()
      const newBucket = Bucket.fromJSON(exported)
      newBucket.size.should.equal(bucket.size)
      newBucket.length.should.equal(bucket.length)
      newBucket._elements.should.deep.equals(bucket._elements)
    })

    it('should reject imports from invalid JSON objects', () => {
      const invalids = [
        {type: 'something'},
        {type: 'Bucket'},
        {type: 'Bucket', size: 1},
        {type: 'Bucket', size: 1, seed: 1},
      ]

      invalids.forEach(json => {
        ;(() => Bucket.fromJSON(json)).should.throw(
          Error,
          'Cannot create a Bucket from a JSON export which does not represent a bucket'
        )
      })
    })
  })
})
