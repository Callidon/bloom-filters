/* file : bit-set-test.js
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


require('chai').should()
const { BitSet } = require('../dist/api')

describe('BitSet', () => {
    it('is initially clear', () => {
        const set = new BitSet(50)
        set.size.should.equal(50)
        for (let i=0; i<set.size; i++) {
            set.has(i).should.equal(false)
        }
    })

    it('reads and clears set values', () => {
        const set = new BitSet(50)
        set.size.should.equal(50)
        for (let i=0; i<set.size; i++) {
            set.has(i).should.equal(false)
            set.add(i)
            set.has(i).should.equal(true)
        }
        for (let i=0; i<set.size; i++) {
            set.has(i).should.equal(true)
            set.remove(i)
            set.has(i).should.equal(false)
        }
    })

    it('finds the high bit', () => {
        const set = new BitSet(150)
        set.size.should.equal(150)
        for (let i=0; i<set.size; i++) {
            set.add(i)
            set.max().should.equal(i)
        }
    })
})