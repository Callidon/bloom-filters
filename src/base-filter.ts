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
import * as seedrandom from 'seedrandom'

export default abstract class BaseFilter {
  private _seed: number
  private _rng: () => number

  constructor () {
    this._seed = utils.getDefaultSeed()
    this._rng = seedrandom(this._seed)
  }

  /**
   * Return the seed used in this structure
   * @return {Number|UINT32|UINT64}
   */
  get seed () {
    return this._seed
  }

  /**
   * Set the seed for this structure
   * @param  {Number|UINT32|UINT64} seed the new seed that will be used in this structure
   * @return {void}
   */
  set seed (seed) {
    this._seed = seed
    this._rng = seedrandom(this._seed)
  }

  /**
   * Compute a random integer
   * @return A random integer
   */
  get random (): () => number {
    return this._rng
  }
}
