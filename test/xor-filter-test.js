/* file : bloom-filter-test.js
MIT License

Copyright (c) 2017 Thomas Minier & Arnaud Grall

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

'use strict'

require('chai').should()
const {XorFilter} = require('../dist/api.js')
const Long = require('long')

describe('XorFilter', () => {
  const elements = [Long.ONE]
  it(`should create a xor filter correctly (array of ${elements.length} element(s))`, () => {
    const filter = new XorFilter(elements, 8)
    filter.has(Long.ONE).should.be.true
    filter.has(Long.fromNumber(2)).should.be.false
  })
  const count = 100000
  it.skip(`should create a xor filter correctly for ${count} elements`, () => {
    const a = []
    const format = e => `${e}`
    for (let i = 0; i < count; i++) {
      a.push(format(i))
    }
    const filter = new XorFilter(a)
    let truthy = 0, falsy = 0
    for (let i = 0; i < count; i++) {
      if (filter.has(format(i))) {
        truthy++
      } else {
        falsy++
      }
    }
    const prob = truthy / count
    prob.should.be.at.least(0.99)
    falsy = 0, truthy = 0
    for (let i = 0; i < count; i++) {
      if (filter.has(format(count + i))) {
        truthy++
      } else {
        falsy++
      }
    }
    console.log(truthy, falsy)
    falsy.should.be.equal(count)
  })
})
