/**
 * @typedef {TwoHashes} Two hashes of the same value, as computed by {@link hashTwice}.
 * @property {number} first - The result of the first hashing function applied to a value
 * @property {number} second - The result of the second hashing function applied to a value
 * @memberof Utils
 */
export interface TwoHashes {
    first: number
    second: number
}

/**
 * Templated TwoHashes type
 */
export interface TwoHashesTemplated<T> {
    first: T
    second: T
}

/**
 * TwoHashes type in number and int format
 */
export interface TwoHashesIntAndString {
    int: TwoHashesTemplated<number>
    string: TwoHashesTemplated<string>
}

/**
 * Data type of an hashable value, must be string, ArrayBuffer or Buffer.
 */
export type HashableInput = string | Uint8Array

/**
 * Type of the seed used in this package
 */
export type SeedType = bigint
