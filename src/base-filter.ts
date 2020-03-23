/* file : base-filter.ts
MIT License

Copyright (c) 2017-2020 Thomas Minier & Arnaud Grall

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

'use strict'

import * as utils from './utils'
import seedrandom from 'seedrandom'

/**
 * A base class for implementing probailistic filters
 * @author Thomas Minier
 * @author Arnaud Grall
 */
export default abstract class BaseFilter {
  private _seed: number
  private _rng: () => number

  constructor () {
    this._seed = utils.getDefaultSeed()
    this._rng = seedrandom(`${this._seed}`)
  }

  /**
   * Get the seed used in this structure
   */
  get seed (): number {
    return this._seed
  }

  /**
   * Set the seed for this structure
   * @param  seed the new seed that will be used in this structure
   */
  set seed (seed: number) {
    this._seed = seed
    this._rng = seedrandom(`${this._seed}`)
  }

  /**
   * Get a function used to draw random number
   * @return A factory function used to draw random integer
   */
  get random (): () => number {
    return this._rng
  }
}
