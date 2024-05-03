import BaseFilter from '../base-filter.mjs'
import { HashableInput, allocateArray } from '../utils.mjs'

// 2^32, computed as a constant as we use it a lot in the HyperLogLog algorithm
const TWO_POW_32 = Math.pow(2, 32)

/**
 * Estimlate the bias-correction constant, denoted alpha in the algorithm, based on the number of registers.
 * As alpha is pretty expensive to compute, we estimate it with the formula from Flajolet et al.
 * @param m - Number of registers in the HyperLogLog algorithm
 * @return The estimated bias-correction constant
 */
function computeAlpha(m: number): number {
    switch (m) {
        case 16:
            return 0.673
        case 32:
            return 0.697
        case 64:
            return 0.709
        default:
            return 0.7213 / (1.0 + 1.079 / m)
    }
}

export interface ExportedHyperLogLog {
    _seed: number
    _nbRegisters: number
    _nbBytesPerHash: number
    _correctionBias: number
    _registers: number[]
}

/**
 * HyperLogLog is an algorithm for the count-distinct problem, approximating the number of distinct elements in a multiset.
 * @see HyperLogLog: the analysis of a near-optimal cardinality estimation algorithm {@link http://algo.inria.fr/flajolet/Publications/FlFuGaMe07.pdf}
 * @author Thomas Minier
 */
export default class HyperLogLog extends BaseFilter {
    /**
     * The number of registers, denoted m in the algorithm
     */
    public _nbRegisters: number

    /**
     * Number of bytes to take per hash, denoted b in the algorithm (b = log2(m))
     */
    public _nbBytesPerHash: number

    /**
     * The bias-correction constant, denoted alpha in the algorithm
     */
    public _correctionBias: number

    /**
     * The registers used to store data
     */
    public _registers: number[]

    /**
     * Constructor
     * @param nbRegisters - The number of registers to use
     */
    constructor(nbRegisters: number) {
        super()
        this._nbRegisters = nbRegisters
        this._nbBytesPerHash = Math.round(Math.log2(nbRegisters))
        this._correctionBias = computeAlpha(nbRegisters)
        this._registers = allocateArray(this._nbRegisters, 0)
    }

    /**
     * Get the number of registers used by the HyperLogLog
     */
    public get nbRegisters(): number {
        return this._nbRegisters
    }

    /**
     * Update The multiset with a new element
     * @param element - Element to add
     */
    public update(element: HashableInput): void {
        // const hashedValue = Buffer.from(hashAsString(element, this.seed))
        const hashedValue = this._hashing
            .hashAsInt(element, this.seed)
            .toString(2)
        const registerIndex =
            1 + parseInt(hashedValue.slice(0, this._nbBytesPerHash - 1), 2)
        // find the left most 1-bit in the second part of the buffer
        const secondPart = hashedValue.slice(this._nbBytesPerHash)
        let posLeftMost = 0
        while (
            secondPart[posLeftMost] !== '1' &&
            posLeftMost < secondPart.length - 1
        ) {
            posLeftMost++
        }
        // update the register
        this._registers[registerIndex] = Math.max(
            this._registers[registerIndex],
            posLeftMost
        )
    }

    /**
     * Estimate the cardinality of the multiset
     * @return The estimated cardinality of the multiset
     */
    public count(round = false): number {
        // Use the standard HyperLogLog estimator
        const harmonicMean = this._registers.reduce(
            (acc: number, value: number) => acc + Math.pow(2, -value),
            0
        )
        let estimation =
            (this._correctionBias * Math.pow(this._nbRegisters, 2)) /
            harmonicMean

        // use linear counting to correct the estimation if E < 5m/2 and some registers are set to zero
        /*if (estimation < ((5/2) * this._nbRegisters) && this._registers.some(value => value === 0)) {
      const nbZeroRegisters = this._registers.filter(value => value === 0).length
      estimation = this._nbRegisters * Math.log(this._nbRegisters / nbZeroRegisters)
    }*/

        // correct the estimation for very large registers
        if (estimation > TWO_POW_32 / 30) {
            estimation = -TWO_POW_32 * Math.log(1 - estimation / TWO_POW_32)
        }
        // round if required
        if (round) {
            estimation = Math.round(estimation)
        }
        return estimation
    }

    /**
     * Compute the accuracy of the cardinality estimation produced by this HyperLogLog
     * @return The accuracy of the cardinality estimation
     */
    public accuracy(): number {
        return 1.04 / Math.sqrt(this._nbRegisters)
    }

    /**
     * Perform the union with another HyperLogLog multiset
     * @param other - Multiset ot merge with
     * @return The union of the two multisets
     */
    public merge(other: HyperLogLog): HyperLogLog {
        if (this.nbRegisters !== other.nbRegisters) {
            throw new Error(
                `Two HyperLogLog must have the same number of registers to be merged. Tried to merge two HyperLogLog with m = ${this.nbRegisters.toString()} and m = ${other.nbRegisters.toString()}`
            )
        }
        const newSketch = new HyperLogLog(this.nbRegisters)
        for (let i = 0; i < this.nbRegisters - 1; i++) {
            newSketch._registers[i] = Math.max(
                this._registers[i],
                other._registers[i]
            )
        }
        return newSketch
    }

    /**
     * Check if another HyperLogLog is equal to this one
     * @param  other - The HyperLogLog to compare to this one
     * @return True if they are equal, false otherwise
     */
    public equals(other: HyperLogLog): boolean {
        if (this.nbRegisters !== other.nbRegisters) {
            return false
        }
        for (let i = 0; i < this.nbRegisters - 1; i++) {
            if (this._registers[i] !== other._registers[i]) {
                return false
            }
        }
        return true
    }

    public saveAsJSON(): ExportedHyperLogLog {
        return {
            _nbRegisters: this._nbRegisters,
            _nbBytesPerHash: this._nbBytesPerHash,
            _correctionBias: this._correctionBias,
            _registers: this._registers,
            _seed: this._seed,
        }
    }

    public static fromJSON(element: ExportedHyperLogLog): HyperLogLog {
        const filter = new HyperLogLog(element._nbRegisters)
        filter.seed = element._seed
        filter._correctionBias = element._correctionBias
        filter._nbBytesPerHash = element._nbBytesPerHash
        filter._nbRegisters = element._nbRegisters
        filter._registers = filter._registers
        return filter
    }
}