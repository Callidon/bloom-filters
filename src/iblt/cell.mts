import { xorBuffer } from '../utils.mjs'
import BaseFilter from '../base-filter.mjs'
import { SeedType } from '../types.mjs'

export interface ExportedCell {
    _idSum: string
    _hashSum: string
    _count: number
    _seed: SeedType
}

/**
 * A cell is an internal datastructure of an {@link InvertibleBloomFilter}.
 * It is composed of an idSum (the XOR of all element inserted in that cell), a hashSum (the XOR of all hashed element in that cell) and a counter (the number of elements inserted in that cell).
 * @author Arnaud Grall
 * @author Thomas Minier
 */
export default class Cell extends BaseFilter {
    public _idSum: Buffer
    public _hashSum: Buffer
    public _count: number

    /**
     * Constructor.
     * To create an empty cell, you might want to use the static Cell#empty() method.
     * @param idSum - The XOR of all element inserted in that cell
     * @param hashSum - The XOR of all hashed element in that cell
     * @param count - The number of elements inserted in that cell
     */
    constructor(idSum: Buffer, hashSum: Buffer, count: number) {
        super()
        this._idSum = idSum
        this._hashSum = hashSum
        this._count = count
    }

    /**
     * Create an empty cell
     * @return An empty Cell
     */
    public static empty(): Cell {
        return new Cell(
            Buffer.allocUnsafe(0).fill(0),
            Buffer.allocUnsafe(0).fill(0),
            0
        )
    }

    /**
     * Get the id sum of the Cell (The XOR of all element inserted in that cell)
     */
    public get idSum(): Buffer {
        return this._idSum
    }

    /**
     * Get the hash sum of the Cell (The XOR of all hashed element in that cell)
     */
    public get hashSum(): Buffer {
        return this._hashSum
    }

    /**
     * Get the number of elements inserted in that cell
     */
    get count(): number {
        return this._count
    }

    /**
     * Add an element in this cell
     * @param idSum - The element to XOR in this cell
     * @param hashSum - The hash of the element to XOR in this cell
     */
    public add(idSum: Buffer, hashSum: Buffer): void {
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
    public xorm(cell: Cell): Cell {
        return new Cell(
            xorBuffer(this._idSum, cell.idSum),
            xorBuffer(this._hashSum, cell.hashSum),
            this._count - cell.count
        )
    }

    /**
     * Test if the Cell is empty
     * @return True if the Cell is empty, False otherwise
     */
    public isEmpty(): boolean {
        return (
            this._idSum.equals(Buffer.from('')) &&
            this._hashSum.equals(Buffer.from('')) &&
            this._count === 0
        )
    }

    /**
     * Test if another Cell is equals to this one
     * @param  cell - The cell to compare with
     * @return True if the two Cells are equals, False otherwise
     */
    public equals(cell: Cell): boolean {
        return (
            this._count === cell.count &&
            this._idSum.equals(cell.idSum) &&
            this._hashSum.equals(cell.hashSum)
        )
    }

    /**
     * Test if the cell is "Pure".
     * A pure cell is a cell with a counter equal to 1 or -1, and with a hash sum equal to the id sum
     * @return True if the cell ius pure, False otherwise
     */
    public isPure(): boolean {
        // A pure cell cannot be empty or must have a count equals to 1 or -1
        if (this.isEmpty() || (this._count !== 1 && this._count !== -1)) {
            return false
        }
        // compare the hashes
        const hashes = this._hashing.hashTwiceAsString(
            JSON.stringify(this._idSum.toJSON()),
            this.seed
        )
        return this._hashSum.equals(Buffer.from(hashes.first))
    }

    public saveAsJSON(): ExportedCell {
        return {
            _idSum: this._idSum.toString(),
            _hashSum: this._hashSum.toString(),
            _count: this._count,
            _seed: this._seed,
        }
    }

    public static fromJSON(element: ExportedCell): Cell {
        const filter = new Cell(
            Buffer.from(element._idSum),
            Buffer.from(element._hashSum),
            element._count
        )
        filter.seed = element._seed
        return filter
    }
}
