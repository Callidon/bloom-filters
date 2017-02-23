/* file : count-min-sketch.js
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

const utils = require('./utils.js');

/**
 * The count–min sketch (CM sketch) is a probabilistic data structure that serves as a frequency table of events in a stream of data.
 * It uses hash functions to map events to frequencies, but unlike a hash table uses only sub-linear space, at the expense of overcounting some events due to collisions.
 *
 * Reference: Schechter, S., Herley, C., & Mitzenmacher, M. (2010, August). Popularity is everything: A new approach to protecting passwords from statistical-guessing attacks. In Proceedings of the 5th USENIX conference on Hot topics in security (pp. 1-8). USENIX Association.
 * @author Thomas Minier
 * @see {@link https://www.usenix.org/legacy/events/hotsec10/tech/full_papers/Schechter.pdf} for more details on Count Min Sketch
 */
class CountMinSketch {
	/**
	 * Constructor. Creates a new Count-Min Sketch whose relative accuracy is within a factor of epsilon with probability delta.
	 * @param {number} epsilon - Factor of relative accuracy
	 * @param {number} delta - Probability of relative accuracy
	 */
	constructor (epsilon, delta) {
		this.epsilon = epsilon;
		this.delta = delta;
		this.columns = Math.ceil(Math.E / epsilon);
		this.rows = Math.ceil(Math.log(1 / delta));
		this.matrix = utils.allocateArray(this.rows, utils.allocateArray(this.columns, 0));
	}

	/**
	 * Update the count min sketch with a new occurrence of an element
	 * @param {string} element - The new element
	 * @return {void}
	 */
	update (element) {
		const hashes = utils.hashTwice(element, true);

		for(let i = 0; i < this.rows; i++) {
			this.matrix[i][utils.doubleHashing(i, hashes.first, hashes.second, this.columns)]++;
		}
	}

	/**
	 * Peform a point query, i.e. estimate the number of occurence of an element
	 * @param {string} element - The element we want to count
	 * @return {int} The estimate number of occurence of the element
	 */
	count (element) {
		let min = Number.MAX_VALUE;
		const hashes = utils.hashTwice(element, true);

		for(let i = 0; i < this.rows; i++) {
			let v = this.matrix[i][utils.doubleHashing(i, hashes.first, hashes.second, this.columns)];
			min = Math.min(v, min);
		}

		return min;
	}

	/**
	 * Merge this sketch with another sketch, if they have the same number of columns and rows.
	 * @param {CountMinSketch} sketch - The sketch to merge with
	 * @return {void}
	 * @throws Error
	 */
	merge (sketch) {
		if (this.columns !== sketch.columns) throw new Error('Cannot merge two sketchs with different number of columns');
		if (this.rows !== sketch.rows) throw new Error('Cannot merge two sketchs with different number of rows');

		for (let i = 0; i < this.rows; i++) {
			for (let j = 0; j < this.columns; j++) {
				this.matrix[i][j] += sketch.matrix[i][j];
			}
		}
	}

	/**
	 * Clone the sketch
	 * @return {CountMinSketch} A new cloned sketch
	 */
	clone () {
		const sketch = new CountMinSketch(this.epsilon, this.delta);
		sketch.merge(this);
		return sketch;
	}
}

module.exports = CountMinSketch;
