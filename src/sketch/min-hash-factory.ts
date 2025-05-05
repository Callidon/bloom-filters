import MinHash, {HashFunction} from './min-hash'
import random from 'lodash/random'

/**
 * Test if a number is a prime number
 * @param x - Number to test
 * @return True if the input is a prime number, False otherwise
 */
function isPrime(x: number): boolean {
  if (x !== 2 && x % 2 === 0) {
    return false
  }
  for (let i = 2; i < Math.sqrt(x); i++) {
    if (x % i === 0) {
      return false
    }
  }
  return true
}

/**
 * Find the fist prime number superior to a number
 * @param x - Input number
 * @return The fist prime number superior to the input number
 */
function closestPrime(x: number): number {
  let i = 0,
    stop = false,
    to_return = i
  while (!stop) {
    if (isPrime(x + i)) {
      to_return = x + i
      stop = true
    }
    i++
  }
  return to_return
}

/**
 * A factory to create MinHash sketches using the same set of hash functions.
 *
 * **WARNING**: Only the MinHash produced by the same factory can be compared between them.
 * @author Thomas Minier
 */
export default class MinHashFactory {
  public _nbHashes: number
  public _maxValue: number
  public _hashFunctions: HashFunction[]

  /**
   * Constructor
   * @param nbHashes - Number of hash functions to use for comouting the MinHash signature
   * @param maxValue - The highest value that can be found in the set to compare
   */
  constructor(nbHashes: number, maxValue: number) {
    this._nbHashes = nbHashes
    this._maxValue = maxValue
    this._hashFunctions = []
    // Generate hash functions
    const c = closestPrime(this._maxValue)
    for (let i = 0; i < this._nbHashes; i++) {
      const a = random(0, this._maxValue, false),
        b = random(0, this._maxValue, false)
      this._hashFunctions.push({a, b, c})
    }
  }

  /**
   * Create a new MinHash set
   * @return A new MinHash set
   */
  public create(): MinHash {
    return new MinHash(this._nbHashes, this._hashFunctions)
  }
}
