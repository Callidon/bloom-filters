import seedrandom from 'seedrandom'
import Hashing from './hashing.js'
import { getDefaultSeed } from './utils.js'
import { SeedType } from './types.js'

/**
 * Exported prng type because it is not from seedrandom
 * Orignal type can be found in: @types/seedrandom
 */
export interface prng {
    (): number
    double(): number
    int32(): number
    quick(): number
    state(): seedrandom
}

/**
 * A base class for implementing probailistic filters
 * @author Thomas Minier
 * @author Arnaud Grall
 */
export default abstract class BaseFilter {
    public _seed: SeedType
    public _rng: prng
    public _hashing: Hashing

    constructor() {
        this._seed = getDefaultSeed()
        this._rng = seedrandom(this._seed.toString()) as prng
        this._hashing = new Hashing()
    }

    /**
     * Get the seed used in this structure
     */
    public get seed(): SeedType {
        return this._seed
    }

    /**
     * Set the seed for this structure
     * @param  seed the new seed that will be used in this structure
     */
    public set seed(seed: SeedType) {
        this._seed = seed
        this._rng = seedrandom(seed.toString()) as prng
    }

    /**
     * Get a function used to draw a seeded random number
     * @return A factory function used to draw a seeded random float
     */
    public get random(): prng {
        return this._rng
    }

    /**
     * Return a next random seeded int32 integer
     * @returns
     */
    public nextInt32(): number {
        return this._rng.int32()
    }
}
