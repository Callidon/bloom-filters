import { xorUint8Array } from './utils.js'

export interface ExportedCell {
    _idSum: number[]
    _hashSum: number
    _count: number
}

/**
 * A cell is an internal datastructure of an {@link InvertibleBloomFilter}.
 * It is composed of an idSum (the XOR of all element inserted in that cell), a hashSum (the XOR of all hashed element in that cell) and a counter (the number of elements inserted in that cell).
 * @author Arnaud Grall
 * @author Thomas Minier
 */
export default class Cell {
    public _idSum: Uint8Array
    public _hashSum: number
    public _count: number

    /**
     * Constructor.
     * To create an empty cell, you might want to use the static Cell#empty() method.
     * @param idSum - The XOR of all element inserted in that cell
     * @param hashSum - The XOR of all hashed elements in that cell
     * @param count - The number of elements inserted in that cell
     */
    constructor(idSum: Uint8Array, hashSum: number, count: number) {
        this._idSum = idSum
        this._hashSum = hashSum
        this._count = count
    }

    /**
     * Create an empty cell
     * @return An empty Cell
     */
    public static empty(): Cell {
        return new Cell(Uint8Array.from([]), 0, 0)
    }

    /**
     * Add an element in this cell
     * @param idSum - The element to XOR in this cell
     * @param hashSum - The hash of the element to XOR in this cell
     */
    public add(idSum: Uint8Array, hashSum: number): void {
        this._idSum = xorUint8Array(this._idSum, idSum)
        this._hashSum = this._hashSum ^ hashSum
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
            xorUint8Array(this._idSum, cell._idSum),
            this._hashSum ^ cell._hashSum,
            this._count - cell._count,
        )
    }

    /**
     * Test if the Cell is empty
     * @return True if the Cell is empty, False otherwise
     */
    public isEmpty(): boolean {
        return (
            this.arrayEqual(this._idSum, Uint8Array.from([])) &&
            this._hashSum === 0 &&
            this._count === 0
        )
    }

    public arrayEqual(a: Uint8Array, b: Uint8Array): boolean {
        return a.every((v, i) => v === b[i])
    }

    /**
     * Test if another Cell is equals to this one
     * @param  cell - The cell to compare with
     * @return True if the two Cells are equals, False otherwise
     */
    public equals(cell: Cell): boolean {
        return (
            this._count === cell._count &&
            this.arrayEqual(this._idSum, cell._idSum) &&
            this._hashSum === cell._hashSum
        )
    }

    public saveAsJSON(): ExportedCell {
        return {
            _idSum: Array.from(this._idSum),
            _hashSum: this._hashSum,
            _count: this._count,
        }
    }

    public static fromJSON(element: ExportedCell): Cell {
        return new Cell(Uint8Array.from(element._idSum), element._hashSum, element._count)
    }
}
