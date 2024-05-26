import { expect, test } from '@jest/globals'
import { CountMinSketch } from '../src/index'
import Global from './global'

const seed = Global.seed(__filename)
const delta = 0.999

test('should support update and point query (count) operations', () => {
    const sketch = CountMinSketch.create(0.001, delta)
    sketch.seed = seed
    // populate the sketch with some values
    sketch.update('foo')
    sketch.update('foo')
    sketch.update('foo')
    sketch.update('bar')
    // assert point queries results
    expect(sketch.count('foo')).toEqual(3)
    expect(sketch.count('bar')).toEqual(1)
    expect(sketch.count('moo')).toEqual(0)
})

test('should support a merge between two sketches', () => {
    const sketch = CountMinSketch.create(0.001, delta)
    sketch.seed = seed
    const otherSketch = CountMinSketch.create(0.001, delta)
    otherSketch.seed = seed

    // populate the sketches with some values
    sketch.update('foo')
    sketch.update('foo')
    sketch.update('foo')
    sketch.update('bar')

    otherSketch.update('foo')
    otherSketch.update('bar')
    otherSketch.update('moo')
    otherSketch.update('moo')

    // merge sketches
    sketch.merge(otherSketch)
    expect(sketch.count('foo')).toEqual(4)
    expect(sketch.count('bar')).toEqual(2)
    expect(sketch.count('moo')).toEqual(2)
})

test('should reject an impossible merge', () => {
    const sketch = CountMinSketch.create(0.001, delta)
    sketch.seed = seed
    const otherSketch = CountMinSketch.create(0.001, delta)
    otherSketch.seed = seed

    otherSketch._columns++
    expect(() => {
        sketch.merge(otherSketch)
    }).toThrow(Error)

    otherSketch._columns--
    otherSketch._rows--
    expect(() => {
        sketch.merge(otherSketch)
    }).toThrow(Error)
})

test('should the clone operation', () => {
    const sketch = CountMinSketch.create(0.001, delta)
    sketch.seed = seed
    // populate the sketches with some values
    sketch.update('foo')
    sketch.update('foo')
    sketch.update('foo')
    sketch.update('bar')

    // clone it
    const clone = sketch.clone()
    expect(clone.count('foo')).toEqual(3)
    expect(clone.count('bar')).toEqual(1)
    expect(clone.count('moo')).toEqual(0)
})

function buildCountMinSketch() {
    const sketch = CountMinSketch.create(0.001, delta)
    sketch.seed = seed
    sketch.update('foo')
    sketch.update('foo')
    sketch.update('foo')
    sketch.update('bar')
    return sketch
}

test('should export a count-min sketch to a JSON object', () => {
    const sketch = buildCountMinSketch()
    const exported = sketch.saveAsJSON()
    expect(exported._rows).toEqual(sketch._rows)
    expect(exported._columns).toEqual(sketch._columns)
    expect(exported._allSums).toEqual(sketch._allSums)
    expect(exported._matrix).toEqual(sketch._matrix)
})

test('should create a count-min sketch from a JSON export', () => {
    const sketch = buildCountMinSketch()
    const exported = sketch.saveAsJSON()
    const newSketch = CountMinSketch.fromJSON(exported)
    expect(newSketch.seed).toEqual(sketch.seed)
    expect(newSketch.columns).toEqual(sketch.columns)
    expect(newSketch.rows).toEqual(sketch.rows)
    expect(newSketch.sum).toEqual(sketch.sum)
    expect(newSketch._matrix).toEqual(sketch._matrix)
})

const max = 100000
const rate = 0.00001
const range = 1000
const random = () => {
    return Math.floor(Math.random() * range)
}
test(`should not return an error when inserting ${max.toString()} elements`, () => {
    const filter = CountMinSketch.create(rate, delta)
    filter.seed = seed
    let error = 0
    const map = new Map<string, number>()
    for (let i = 0; i < max; ++i) {
        const item = random().toString()
        // update
        filter.update(item)
        let retrievedItem = map.get(item)
        if (!retrievedItem) {
            map.set(item, 1)
        } else {
            map.set(item, retrievedItem + 1)
        }

        // check the item
        // at this point this item is known
        retrievedItem = map.get(item)
        if (retrievedItem) {
            const count = filter.count(item)
            const est = retrievedItem + rate * filter.sum
            if (count > est) {
                error += 1
            }
        }
    }

    const errorRate = error / max
    const errorProb = 1 - Math.pow(Math.E, -filter.rows)
    expect(errorRate).toBeLessThanOrEqual(errorProb)
})
