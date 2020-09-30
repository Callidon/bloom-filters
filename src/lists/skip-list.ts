/* file: skip-list.ts
MIT License

Copyright (c) 2019-2020 Thomas Minier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the 'Software'), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import BaseFilter from '../base-filter'

export class Node<T> {
  constructor(
    private _value: T,
    private _level: number,
    private _nextNode: Node<T> | null,
    private _belowNode: Node<T> | null
    ) {}
  
  getValue(): T {
    return this._value
  }

  getLevel(): number {
    return this._level
  }

  isTail(): boolean {
    return this._nextNode === null
  }

  isBottom(): boolean {
    return this._belowNode == null
  }

  getNextNode(): Node<T> | null {
    return this._nextNode
  }

  setNextNode(node: Node<T>): void {
    this._nextNode = node
  }

  getBelowNode(): Node<T> | null {
    return this._belowNode
  }

  setBelowNode(node: Node<T>): void {
    this._belowNode = node
  }
}

export interface NodePosition {
  level: number
  position: number
}

export class SkipList<T> extends BaseFilter {
  private _head: Node<T> | null
  private _depth: number

  constructor (private _probability: number) {
    super()
    this._head = null
    this._depth = 0
  }

  findIndex (value: T): NodePosition {
    if (this._head === null) {
      return { level: -1, position: -1 }
    }
    let node: Node<T> | null = this._head
    let level = 0
    let position = 0
    while (node !== null && !node.isBottom()) {
      node = node.getBelowNode()
      level++
      position = 0
      while (!node!.isTail() && value >= node!.getNextNode()!.getValue()) {
        node = node!.getNextNode()
        position++
      }
    }
    return { level, position }
  }

  get (index: NodePosition): T | null {
    if (index.level > this._depth) {
      return null
    }
    let node = this._head
    for (let i = 0; i < index.level; i++) {
      if (node!.isBottom()) {
        return null
      }
      node = node!.getBelowNode()
    }
    for (let i = 0; i < index.position; i++) {
      if (node!.isTail()) {
        return null
      }
      node = node!.getNextNode()
    }
    return node!.getValue()
  }

  push (value: T): void {

  }
  
}
