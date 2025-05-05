import seedrandom, {PRNG} from 'seedrandom'
import Hashing from './hashing'
import {getDefaultSeed} from './utils'

/**
 * A base class for implementing probailistic filters
 * @author Thomas Minier
 * @author Arnaud Grall
 */
export default abstract class BaseFilter {
  public _seed: bigint
  public _rng: PRNG
  public _hashing: Hashing

  constructor() {
    this._seed = getDefaultSeed()
    this._rng = seedrandom(`${this._seed}`)
    this._hashing = new Hashing()
  }

  /**
   * Get the seed used in this structure
   */
  public get seed(): bigint {
    return this._seed
  }

  /**
   * Set the seed for this structure
   * @param  seed the new seed that will be used in this structure
   */
  public set seed(seed: bigint) {
    this._seed = seed
    this._rng = seedrandom(`${this._seed}`)
  }

  /**
   * Get a function used to draw random number
   * @return A factory function used to draw random integer
   */
  public get random() {
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
