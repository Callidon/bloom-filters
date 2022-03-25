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

require('chai').should()
const {XorFilter} = require('../dist/api.js')

describe('XorFilter', () => {
  const elements = ['1']
  const count = 1000
  const sizes = [8, 16]
  sizes.forEach(size => {
    it(`[XOR/${size}] should create a xor filter correctly (array of ${elements.length} element(s))`, () => {
      const filter = XorFilter.create(elements, size)
      filter.has(elements[0]).should.be.true
      filter.has('2').should.be.false
    })
    it(`[XOR/${size}] should create a xor filter correctly for ${count} elements`, () => {
      const a = []
      const format = e => `hash:${e}`
      for (let i = 0; i < count; i++) {
        a.push(format(i))
      }
      const filter = XorFilter.create(a, size)
      let truthy = 0,
        falsy = 0
      for (let i = 0; i < count; i++) {
        if (filter.has(format(i))) {
          truthy++
        } else {
          falsy++
        }
      }
      let prob = truthy / count
      prob.should.be.at.least(0.99)
      ;(falsy = 0), (truthy = 0)
      for (let i = 0; i < count; i++) {
        if (filter.has(format(count * 10 + i))) {
          truthy++
        } else {
          falsy++
        }
      }
      prob = falsy / count
      prob.should.be.at.least(0.99)
    })
    it(`[XOR/${size}] exported filter should be importable`, () => {
      const filter = XorFilter.create(['alice'])
      const json = filter.saveAsJSON()
      const newFilter = XorFilter.fromJSON(json)
      filter.equals(newFilter)
    })
  })
})
