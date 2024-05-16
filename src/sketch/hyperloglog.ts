import BaseFilter from '../base-filter'
import { ExportedBigInt, allocateArray, exportBigInt, importBigInt } from '../utils'
import { HashableInput } from '../types'

// 2^32, computed as a constant as we use it a lot in the HyperLogLog algorithm
const TWO_POW_32 = 2 ** 32

/**
 * Estimlate the bias-correction constant, denoted alpha in the algorithm, based on the number of registers.
 * As alpha is pretty expensive to compute, we estimate it with the formula from Flajolet et al.
 * @param m - Number of registers in the HyperLogLog algorithm
 * @return The estimated bias-correction constant
 */
function computeAlpha(m: number): number {
    if (m < 16) {
        return 1
    } else if (m < 32) {
        return 0.673
    } else if (m < 64) {
        return 0.697
    } else if (m < 128) {
        return 0.709
    } else {
        // >= 128
        return 0.7213 / (1.0 + 1.079 / m)
    }
}

export interface ExportedHyperLogLog {
    _seed: ExportedBigInt
    _m: number
    _b: number
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
    public _m: number

    /**
     * Number of bits to take per hash, denoted b in the algorithm (b = log2(m))
     */
    public _b: number

    /**
     * The bias-correction constant, denoted alpha in the algorithm
     */
    public _correctionBias: number

    /**
     * The registers used to store data
     */
    public _registers: number[]

    /**
     * Hash size in bits of the hash function used.
     * We use 64-bits hash function to avoid collisions for bigger sets but a 32-bits like the standard one would be enough for most cases
     */
    public HASH_SIZE = 64

    /**
     * Constructor
     * @param nbRegisters - The number of registers to use; should be a power of 2: 2^b with b in [4..16]
     */
    constructor(nbRegisters: number) {
        super()
        if ((nbRegisters & (nbRegisters - 1)) !== 0) {
            throw new Error('The number of registers should be a power of 2')
        }
        this._m = nbRegisters
        this._b = Math.ceil(Math.log2(nbRegisters))
        this._correctionBias = computeAlpha(nbRegisters)
        this._registers = allocateArray(this._m, 0)
    }

    /**
     * Get the number of registers used by the HyperLogLog
     */
    public get nbRegisters(): number {
        return this._m
    }

    /**
     * Update The multiset with a new element
     * @param element - Element to add
     */
    public update(element: HashableInput): void {
        const x = this._hashing._lib
            .xxh64(element, this.seed)
            .toString(2)
            .padStart(this.HASH_SIZE, '0')
        const k = this.HASH_SIZE - this._b
        // the first b bits are from the right
        const first = x.slice(k)
        // the last k are the next
        const second = x.slice(0, k)
        const registerIndex = parseInt(first, 2)
        // find the left most 1-bit in the second part of the buffer
        // simple while loop
        let leftmost_pos = k - 1
        let found = false
        let i = 0
        while (!found && i < second.length) {
            if (second[i] === '1') {
                found = true
                leftmost_pos = i
            } else {
                i++
            }
        }
        this._registers[registerIndex] = Math.max(this._registers[registerIndex], leftmost_pos)
    }

    /**
     * Estimate the cardinality of the multiset
     * @return The estimated cardinality of the multiset
     */
    public count(round = false): number {
        // Use the standard HyperLogLog estimator
        const Z = this._registers.reduce(
            (acc: number, value: number) => acc + Math.pow(2, -value),
            0,
        )
        const raw_estimation = (this._correctionBias * this._m * this._m * 2) / Z

        let corrected_estimation
        if (raw_estimation <= (5 / 2) * this._m) {
            // use linear counting to correct the estimation if E < 5m/2 and some registers are set to zero
            const V = this._registers.filter(value => value === 0).length
            if (V > 0) {
                // small range correction: linear counting
                corrected_estimation = this._m * Math.log(this._m / V)
            } else {
                corrected_estimation = raw_estimation
            }
        } else if (raw_estimation <= TWO_POW_32 / 30) {
            // middle range correction; no correction
            corrected_estimation = raw_estimation
        } else {
            // raw_estimation > TWO_POW_32 / 30
            // large range correction
            corrected_estimation = -TWO_POW_32 * Math.log(1 - raw_estimation / TWO_POW_32)
        }
        if (round) {
            return Math.round(corrected_estimation)
        }
        return corrected_estimation
    }

    /**
     * Compute the relative error of this filter: +/- 1.04/sqrt(m)
     * @return The relative error
     */
    public relative_error(): number {
        return 1.04 / Math.sqrt(this._m)
    }

    /**
     * Perform the union with another HyperLogLog multiset
     * @param other - Multiset ot merge with
     * @return The union of the two multisets
     */
    public merge(other: HyperLogLog): HyperLogLog {
        if (this.nbRegisters !== other.nbRegisters) {
            throw new Error(
                `Two HyperLogLog must have the same number of registers to be merged. Tried to merge two HyperLogLog with m = ${this.nbRegisters.toString()} and m = ${other.nbRegisters.toString()}`,
            )
        }
        const newSketch = new HyperLogLog(this.nbRegisters)
        for (let i = 0; i < this.nbRegisters - 1; i++) {
            newSketch._registers[i] = Math.max(this._registers[i], other._registers[i])
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
            _m: this._m,
            _b: this._b,
            _correctionBias: this._correctionBias,
            _registers: this._registers,
            _seed: exportBigInt(this._seed),
        }
    }

    public static fromJSON(element: ExportedHyperLogLog): HyperLogLog {
        const filter = new HyperLogLog(element._m)
        filter.seed = importBigInt(element._seed)
        filter._correctionBias = element._correctionBias
        filter._b = element._b
        filter._registers = element._registers
        return filter
    }
}
