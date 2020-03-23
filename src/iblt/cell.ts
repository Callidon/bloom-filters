/* file: cell.ts
MIT License

Copyright (c) 2019-2020 Thomas Minier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the 'Software'), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use strict'

import { hashTwiceAsString, xorBuffer } from '../utils'
import { AutoExportable, Field, Parameter } from '../exportable'
import BaseFilter from '../base-filter'

const inspect = Symbol.for('nodejs.util.inspect.custom')

/**
 * A cell is an internal datastructure of an {@link InvertibleBloomFilter}.
 * It is composed of an idSum (the XOR of all element inserted in that cell), a hashSum (the XOR of all hashed element in that cell) and a counter (the number of elements inserted in that cell).
 * @author Arnaud Grall
 * @author Thomas Minier
 */
@AutoExportable('Cell', ['_seed'])
export default class Cell extends BaseFilter {
  @Field<Buffer>(elt => elt.toString(), Buffer.from)
  private _idSum: Buffer

  @Field<Buffer>(elt => elt.toString(), Buffer.from)
  private _hashSum: Buffer

  @Field()
  private _count: number

  /**
   * Constructor.
   * To create an empty cell, you might want to use the static Cell#empty() method.
   * @param idSum - The XOR of all element inserted in that cell
   * @param hashSum - The XOR of all hashed element in that cell
   * @param count - The number of elements inserted in that cell
   */
  constructor (@Parameter('_idSum') idSum: Buffer, @Parameter('_hashSum') hashSum: Buffer, @Parameter('_count') count: number) {
    super()
    this._idSum = idSum
    this._hashSum = hashSum
    this._count = count
  }

  /**
   * Create an empty cell
   * @return An empty Cell
   */
  static empty(): Cell {
    return new Cell(Buffer.allocUnsafe(0).fill(0), Buffer.allocUnsafe(0).fill(0), 0)
  }

  [inspect] () {
    return `Cell:<${JSON.stringify(this._idSum.toJSON().data)}, ${JSON.stringify(this._hashSum.toJSON().data)}, ${this._count}>`
  }

  /**
   * Get the id sum of the Cell (The XOR of all element inserted in that cell)
   */
  get idSum (): Buffer {
    return this._idSum
  }

  /**
   * Get the hash sum of the Cell (The XOR of all hashed element in that cell)
   */
  get hashSum (): Buffer {
    return this._hashSum
  }

  /**
   * Get the number of elements inserted in that cell
   */
  get count (): number {
    return this._count
  }

  /**
   * Add an element in this cell
   * @param idSum - The element to XOR in this cell
   * @param hashSum - The hash of the element to XOR in this cell
   */
  add (idSum: Buffer, hashSum: Buffer): void {
    this._idSum = xorBuffer(this._idSum, idSum)
    this._hashSum = xorBuffer(this._hashSum, hashSum)
    this._count++
  }

  /**
   * Perform the XOR operation between this Cell and another one and returns a resulting Cell.
   * A XOR between two cells is the XOR between their id sum and hash sum,
   * and the difference between their count.
   * @param cell - Cell to perform XOR with
   * @return A new Cell, resulting from the XOR operation
   */
  xorm (cell: Cell): Cell {
    return new Cell(xorBuffer(this._idSum, cell.idSum), xorBuffer(this._hashSum, cell.hashSum), this._count - cell.count)
  }

  /**
   * Test if the Cell is empty
   * @return True if the Cell is empty, False otherwise
   */
  isEmpty (): boolean {
    return this._idSum.equals(Buffer.from('')) && this._hashSum.equals(Buffer.from('')) && this._count === 0
  }

  /**
   * Test if another Cell is equals to this one
   * @param  cell - The cell to compare with
   * @return True if the two Cells are equals, False otherwise
   */
  equals (cell: Cell): boolean {
    return this._count === cell.count && this._idSum.equals(cell.idSum) && this._hashSum.equals(cell.hashSum)
  }

  /**
   * Test if the cell is "Pure".
   * A pure cell is a cell with a counter equal to 1 or -1, and with a hash sum equal to the id sum
   * @return True if the cell ius pure, False otherwise
   */
  isPure (): boolean {
    // A pure cell cannot be empty or must have a count equals to 1 or -1
    if (this.isEmpty() || (this._count !== 1 && this._count !== -1)) {
      return false
    }
    // compare the hashes
    const hashes = hashTwiceAsString(JSON.stringify(this._idSum.toJSON()), this.seed)
    return this._hashSum.equals(Buffer.from(hashes.first))
  }
}
