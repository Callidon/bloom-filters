/**
 * Various formulas used with Bloom Filters
 * @namespace Formulas
 * @private
 */

/**
 * Compute the optimal size of a Bloom Filter
 * @param  length - The length of the set used to fill the filter
 * @param  errorRate - The targeted false positive rate
 * @return The optimal size of a Bloom Filter
 * @memberof Formulas
 */
export function optimalFilterSize(length: number, errorRate: number): number {
    return Math.ceil(-((length * Math.log(errorRate)) / Math.pow(Math.log(2), 2)))
}

/**
 * Compute the optimal number of hash functions to be used by a Bloom Filter
 * @param  size - The size of the filter
 * @param  length - The length of the set used to fill the filter
 * @return The optimal number of hash functions to be used by a Bloom Filter
 * @memberof Formulas
 */
export function optimalHashes(size: number, length: number): number {
    return Math.ceil((size / length) * Math.log(2))
}
