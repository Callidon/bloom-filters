/* file : BitSet.ts
MIT License

Copyright (c) 2021 David Leppik

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/** A memory-efficient Boolean array. Contains just the minimal operations needed for our Bloom filter implementation.
 *
 * @author David Leppik
 */

const bitsPerWord = 8;

export default class BitSet {
    public readonly size: number;

    // Uint32Array may be slightly faster due to memory alignment, but this avoids endianness when serializing
    private readonly array: Uint8Array;

    constructor(size: number) {
        this.size = size
        this.array = new Uint8Array(Math.ceil(size / bitsPerWord))
    }

    has(index: number): boolean {
        const word = Math.floor(index / bitsPerWord)
        const mask = 1 << (index % bitsPerWord)
        return (this.array[word] & mask) !== 0
    }

    add(index: number) {
        const word = Math.floor(index / bitsPerWord)
        const mask = 1 << (index % bitsPerWord)
        this.array[word] = this.array[word] | mask
    }

    remove(index: number) {
        const word = Math.floor(index / bitsPerWord)
        const mask = 1 << (index % bitsPerWord)
        this.array[word] = this.array[word] ^ mask
    }

    /** Returns the maximum set bit. */
    max(): number {
        for (let i = this.array.length - 1; i >= 0; i--) {
            let bits = this.array[i];
            if (bits) {
                return BitSet.highBit(bits) + (i*bitsPerWord);
            }
        }
        return 0;
    }

    private static highBit(bits : number) : number {
        let result = bitsPerWord - 1;
        let mask = 1 << result;
        while (result >= 0 && ((mask & bits) !== mask)) {
            mask >>>= 1;
            result--;
        }
        return result;
    }
}