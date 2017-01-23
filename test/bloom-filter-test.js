/* file : bloom-filter.js
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
const BloomFilter = require('../src/bloom-filter.js');

describe('BloomFilter', () => {
	describe('construction', () => {

		it('should add element to the filter with #add', () => {
			const filter = new BloomFilter(15, 2);
			filter.add('alice');
			filter.add('bob');
			filter.length.should.equal(2);
		});

		it('should build a new filter using #from', () => {
			const data = [ 'alice', 'bob', 'carl' ];
			const targetRate = 0.1;
			const expectedSize = Math.floor(-((data.length * Math.log(targetRate))/Math.pow(Math.log(2), 2)));
			const expectedHashes = (expectedSize / data.length) * Math.log(2);
			const filter = BloomFilter.from(data, targetRate);

			filter.size.should.equal(expectedSize);
			filter.nbHashes.should.equal(expectedHashes);
			filter.length.should.equal(data.length);
			filter.rate().should.be.closeTo(targetRate, 0.1);
		});
	});
	describe('#has', () => {
		const filter = BloomFilter.from([ 'alice', 'bob', 'carl' ], 0.1);

		it('should return false for inexistent elements', () => {
			filter.has('daniel').should.be.false;
		});

		it('should return true for elements that might be in the set', () => {
			filter.has('alice').should.be.true;
			filter.has('bob').should.be.true;
			filter.has('carl').should.be.true;
		});
	});
});
