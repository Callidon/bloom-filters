/* file : cuckoo-filter-test.js
MIT License

Copyright (c) 2016 Thomas Minier & Arnaud Grall

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

'use strict';

require('chai').should();
const murmur = require('murmurhash3js');
const CuckooFilter = require('../src/cuckoo-filter.js');

describe('CuckooFilter', () => {
  describe('#_locations', () => {
    it('should compute the fingerprint and indexes for an element', () => {
      const filter = new CuckooFilter(15, 3, 2);
      const element = 'foo';
      const hash = murmur.x86.hash32(element);
      const fingerprint = hash.toString(16).substring(0, 3);
      const firstIndex = Math.abs(hash);
      const secondIndex = Math.abs(firstIndex ^ Math.abs(murmur.x86.hash32(fingerprint)));

      const locations = filter._locations(element);
      locations.fingerprint.should.equal(fingerprint);
      locations.firstIndex.should.equal(firstIndex % filter.size);
      locations.secondIndex.should.equal(secondIndex % filter.size);
    });
  });

  describe('#add', () => {
    it('should add element to the filter with #add', () => {
      const filter = new CuckooFilter(15, 3, 2);
      let nbElements = 0;
      filter.add('alice');
      filter.add('bob');
      filter.length.should.equal(2);
      filter.filter.forEach(bucket => nbElements += bucket.length);
      nbElements.should.equal(2);
    });

    it('should should store ane element accross two different buckets', () => {
      const filter = new CuckooFilter(15, 3, 2);
      const element = 'foo';
      let nbElements = 0;

      const locations = filter._locations(element);
      // fill up all buckets (needs 4 insertions since bucket size = 2)
      filter.add(element);
      filter.add(element);
      filter.add(element);
      filter.add(element);

      // assert that buckets are full
      filter.filter[locations.firstIndex].isFree().should.be.false;
      filter.filter[locations.secondIndex].isFree().should.be.false;

      nbElements += filter.filter[locations.firstIndex].length + filter.filter[locations.secondIndex].length;
      nbElements.should.equal(4);
    });

    it('should perform random kicks when both buckets are full', () => {
      const filter = new CuckooFilter(15, 3, 1);
      const element = 'foo';
      let nbElements = 0;
      const locations = filter._locations(element);
      // artificially fills up the two possible buckets with dumb values
      filter.filter[locations.firstIndex].add('001');
      filter.filter[locations.secondIndex].add('002');
      filter.length += 2;

      filter.add(element).should.be.true;

      filter.filter.forEach(bucket => {
        if(bucket.length > 0) {
          bucket.elements[0].should.be.oneOf([ '001', '002', locations.fingerprint ]);
          nbElements += bucket.length;
        }
      });
      filter.length.should.equal(3);
      nbElements.should.equal(3);
    });

    it('should reject elements that can\'t be inserted when filter is full', () => {
      const filter = new CuckooFilter(1, 3, 1);
      const element = 'foo';
      filter.add(element);
      filter.add(element).should.be.false;
    });
  });

  describe('#remove', () => {
    it('should remove exisiting elements from the filter', () => {
      const filter = new CuckooFilter(15, 3, 1);
      const element = 'foo';
      const locations = filter._locations(element);

      filter.add(element);
      filter.remove(element).should.be.true;
      filter.filter[locations.firstIndex].length.should.equal(0);
    });

    it('should look inside every possible bucket', () => {
      const filter = new CuckooFilter(15, 3, 1);
      const element = 'foo';
      const locations = filter._locations(element);

      filter.add(element);
      filter.add(element);
      filter.remove(element).should.be.true;
      filter.filter[locations.firstIndex].length.should.equal(0);
      filter.remove(element).should.be.true;
      filter.filter[locations.secondIndex].length.should.equal(0);
    });

    it('should fail to remove elements that are not in the filter', () => {
      const filter = new CuckooFilter(15, 3, 1);
      filter.add('foo');
      filter.remove('moo').should.be.false;
    });
  });

  describe('#has', () => {
    it('should return True when an element may be in the filter', () => {
      const filter = new CuckooFilter(15, 3, 1);
      filter.add('foo');
      filter.has('foo').should.be.true;
    });

    it('should return False when an element is definitively not in the filter', () => {
      const filter = new CuckooFilter(15, 3, 1);
      filter.add('foo');
      filter.has('moo').should.be.false;
    });

    it('should look inside every possible bucket', () => {
      const filter = new CuckooFilter(15, 3, 1);
      filter.add('foo');
      filter.add('foo');
      filter.remove('foo');
      filter.has('foo').should.be.true;
    });
  });
});
