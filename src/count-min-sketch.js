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
 * Reference: Cormode, G., & Muthukrishnan, S. (2005). An improved data stream summary: the count-min sketch and its applications. Journal of Algorithms, 55(1), 58-75.
 * @author Thomas Minier
 * @see {@link http://vaffanculo.twiki.di.uniroma1.it/pub/Ing_algo/WebHome/p14_Cormode_JAl_05.pdf} for more details on Count Min Sketch
 * @example
 * const CountMinSketch = require('bloom-filters').CountMinSketch;
 *
 * // create a new count min sketch with epsilon = 0.001 and delta = 0.99
 * const sketch = new CountMinSketch(0.001, 0.99);
 *
 * // push some occurrences in the sketch
 * sketch.update('alice');
 * sketch.update('alice');
 * sketch.update('bob');
 *
 * // count occurrences
 * console.log(sketch.count('alice')); // output: 2
 * console.log(sketch.count('bob')); // output: 1
 * console.log(sketch.count('daniel')); // output: 0
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
		this.matrix = utils.allocateArray(this.rows, () => utils.allocateArray(this.columns, 0));
	}

	/**
	 * Update the count min sketch with a new occurrence of an element
	 * @param {string} element - The new element
	 * @return {void}
	 * @example
	 * const sketch = new CountMinSketch(0.001, 0.99);
	 * sketch.update('foo');
	 */
	update (element) {
		const hashes = utils.hashTwice(element, true);

		for(let i = 0; i < this.rows; i++) {
			this.matrix[i][utils.doubleHashing(i, hashes.first, hashes.second, this.columns)]++;
		}
	}

	/**
	 * Perform a point query, i.e. estimate the number of occurence of an element
	 * @param {string} element - The element we want to count
	 * @return {int} The estimate number of occurence of the element
	 * @example
	 * const sketch = new CountMinSketch(0.001, 0.99);
	 * sketch.update('foo');
	 * sketch.update('foo');
	 *
	 * console.log(sketch.count('foo')); // output: 2
	 * console.log(sketch.count('bar')); // output: 0
	 */
	count (element) {
		let min = Infinity;
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
	 * @example
	 * const sketch = new CountMinSketch(0.001, 0.99);
	 * const otherSketch = new CountMinSketch(0.001, 0.99);
	 *
	 * sketch.update('foo');
	 * otherSketch.update('foo');
	 * otherSketch.update('bar');
	 *
	 * // merge the two sketches
	 * sketch.merge(otherSketch);
	 * console.log(sketch.count('foo')); // output: 2
	 * console.log(sketch.count('bar')); // output: 1
	 */
	merge (sketch) {
		if (this.columns !== sketch.columns) throw new Error('Cannot merge two sketches with different number of columns');
		if (this.rows !== sketch.rows) throw new Error('Cannot merge two sketches with different number of rows');

		for (let i = 0; i < this.rows; i++) {
			for (let j = 0; j < this.columns; j++) {
				this.matrix[i][j] += sketch.matrix[i][j];
			}
		}
	}

	/**
	 * Clone the sketch
	 * @return {CountMinSketch} A new cloned sketch
	 * @example
	 * const sketch = new CountMinSketch(0.001, 0.99);
	 * sketch.update('foo');
	 *
	 * const clone = sketch.clone();
	 * console.log(clone.count('foo')); // output: 1
	 */
	clone () {
		const sketch = new CountMinSketch(this.epsilon, this.delta);
		sketch.merge(this);
		return sketch;
	}
}

module.exports = CountMinSketch;
