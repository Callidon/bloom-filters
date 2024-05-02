import BaseFilter from '../base-filter'
import CountMinSketch, { ExportedCountMinSketch } from './count-min-sketch'
import { sortedIndexBy } from 'lodash'

/**
 * An element in a MinHeap
 * @author Thomas Minier
 */
export interface HeapElement {
    value: string
    frequency: number
}

/**
 * An element in a TopK
 * @author Thomas Minier
 */
export interface TopkElement extends HeapElement {
    rank: number
}

export interface ExportedMinHeap {
    _content: HeapElement[]
}

/**
 * A MinHeap stores items sorted by ascending frequency
 * @author Thomas Minier
 */
export class MinHeap {
    public _content: HeapElement[]

    constructor() {
        this._content = []
    }

    /**
     * Get the number of items in the heap
     */
    public get length() {
        return this._content.length
    }

    public get content() {
        return this._content
    }

    public set content(value: HeapElement[]) {
        this._content = value
    }

    /**
     * Access an item at a given index
     * @param index - Index of the item
     * @return The item or `undefined` if the index is out of the array
     */
    public get(index: number): HeapElement | undefined {
        return this._content[index]
    }

    /**
     * Add a new element to the heap and keep items sorted by ascending frequency
     * @param element - Element to insert
     */
    public add(element: HeapElement) {
        // kepp items sorted by frequency
        const index = sortedIndexBy(
            this._content,
            element,
            heapElement => heapElement.frequency
        )
        this._content.splice(index, 0, element)
    }

    /**
     * Remove an item at a given index and keep items sorted by ascending frequency
     * @param index - Index of the item to remove
     */
    public remove(index: number): void {
        this._content.splice(index, 1)
    }

    /**
     * Remove and returns the element with the smallest frequency in the heap
     * @return The element with the smallest frequency in the heap
     */
    public popMin(): HeapElement | undefined {
        return this._content.shift()
    }

    /**
     * Get the index of an element by its value
     * @param value - Value of the element to search for
     * @return Index of the element or -1 if it is not in the heap
     */
    public indexOf(value: string): number {
        // TODO optimize
        return this._content.findIndex(
            heapElement => heapElement.value === value
        )
        // const index = sortedIndexBy(this._content, {value, frequency: 0}, heapElement => heapElement.value)
        // if (this._content[index] !== undefined && this._content[index].value === value) {
        //   return index
        // }
        // return -1
    }

    /**
     * Clear the content of the heap
     */
    public clear() {
        this._content = []
    }

    public saveAsJSON(): ExportedMinHeap {
        return {
            _content: this._content,
        }
    }

    public static fromJSON(element: ExportedMinHeap): MinHeap {
        const filter = new MinHeap()
        filter._content = element._content
        return filter
    }
}

export interface ExportedTopK {
    _seed: number
    _k: number
    _errorRate: number
    _accuracy: number
    _sketch: ExportedCountMinSketch
    _heap: ExportedMinHeap
}

/**
 * A TopK computes the ranking of elements in a multiset (by an arbitrary score) and returns the `k` results with the highest scores.
 * This implementation of the TopK problem sorts items based on their estimated cardinality in the multiset.
 * It is based on a Count Min Sketch, for estimating the cardinality of items, and a MinHeap, for implementing a sliding window over the `k` results with the highest scores.
 * @author Thomas Minier
 * @author Arnaud Grall
 */
export default class TopK extends BaseFilter {
    public _k: number
    public _errorRate: number
    public _accuracy: number
    public _sketch: CountMinSketch
    public _heap: MinHeap

    /**
     * Constructor
     * @param k - How many elements to store
     * @param errorRate - The error rate
     * @param accuracy  - The probability of accuracy
     */
    constructor(k: number, errorRate: number, accuracy: number) {
        super()
        this._k = k
        this._errorRate = errorRate
        this._accuracy = accuracy
        this._sketch = CountMinSketch.create(errorRate, accuracy)
        this._heap = new MinHeap()
    }

    /**
     * Add an element to the TopK
     * @param element - Element to add
     */
    public add(element: string, count = 1): void {
        if (0 >= count) {
            throw new Error(`count must be > 0 (was ${count.toString()})`)
        }
        this._sketch.update(element, count)
        const frequency = this._sketch.count(element)

        if (
            this._heap.length < this._k ||
            frequency >= this._heap.get(0)!.frequency // eslint-disable-line @typescript-eslint/no-non-null-assertion
        ) {
            const index = this._heap.indexOf(element)
            // remove the entry if it is already in the MinHeap
            if (index > -1) {
                this._heap.remove(index)
            }
            // add the new entry
            this._heap.add({
                value: element,
                frequency,
            })
            // if there is more items than K, then remove the smallest item in the heap
            if (this._heap.length > this._k) {
                this._heap.popMin()
            }
        }
    }

    /**
     * Clear the content of the TopK
     */
    public clear(): void {
        this._sketch = CountMinSketch.create(this._errorRate, this._accuracy)
        this._heap.clear()
    }

    /**
     * Get the top-k values as an array of objects {value: string, frequency: number, rank: number}
     * @return The top-k values as an array of objects {value: string, frequency: number, rank: number}
     */
    public values(): TopkElement[] {
        const res: {
            value: string
            frequency: number
            rank: number
        }[] = []
        for (let i = this._heap.length - 1; i >= 0; i--) {
            const elt = this._heap.get(i)! // eslint-disable-line @typescript-eslint/no-non-null-assertion
            res.push({
                value: elt.value,
                frequency: elt.frequency,
                rank: this._heap.length - i,
            })
        }
        return res
    }

    /**
     * Get the top-k values as an iterator that yields objects {value: string, frequency: number, rank: number}.
     * WARNING: With this method, values are produced on-the-fly, hence you should not modify the TopK
     * while the iteration is not completed, otherwise the generated values may not respect the TopK properties.
     * @return The top-k values as an iterator of object {value: string, frequency: number, rank: number}
     */
    public iterator(): Generator<TopkElement> {
        const heap = this._heap
        return (function* () {
            for (let i = heap.length - 1; i >= 0; i--) {
                const elt = heap.get(i)! // eslint-disable-line @typescript-eslint/no-non-null-assertion
                yield {
                    value: elt.value,
                    frequency: elt.frequency,
                    rank: heap.length - i,
                }
            }
        })()
    }

    public saveAsJSON(): ExportedTopK {
        return {
            _seed: this._seed,
            _accuracy: this._accuracy,
            _errorRate: this._errorRate,
            _heap: this._heap.saveAsJSON(),
            _k: this._k,
            _sketch: this._sketch.saveAsJSON(),
        }
    }

    public static fromJSON(element: ExportedTopK): TopK {
        const filter = new TopK(
            element._k,
            element._errorRate,
            element._accuracy
        )
        filter.seed = element._seed
        filter._heap = MinHeap.fromJSON(element._heap)
        filter._sketch = CountMinSketch.fromJSON(element._sketch)
        return filter
    }
}
