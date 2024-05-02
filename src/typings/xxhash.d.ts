declare module '@node-rs/xxhash'

export type BufferLike =
    | Buffer
    | string
    | Uint8Array
    | ArrayBuffer
    | SharedArrayBuffer
    | readonly number[]
    | number[]

export function xxh32(input: BufferLike, seed?: number): number
export function xxh64(input: BufferLike, seed?: bigint): bigint

export class Xxh32 {
    constructor(seed?: number)
    update(input: BufferLike): this
    digest(): number
    reset(): void
}

export class Xxh64 {
    constructor(seed?: bigint)
    update(input: BufferLike): this
    digest(): bigint
    reset(): void
}

export class Xxh3 {
    static withSeed(seed?: bigint): Xxh3
    static withSecret(secret: BufferLike): Xxh3
    update(input: BufferLike): this
    digest(): bigint
    reset(): void
}

export const xxh3: {
    xxh64: (input: BufferLike, seed?: bigint) => bigint
    xxh64WithSecret: (input: BufferLike, secret: BufferLike) => bigint
    xxh128: (input: BufferLike, seed?: bigint) => bigint
    xxh128WithSecret: (input: BufferLike, secret: BufferLike) => bigint
    Xxh3: typeof Xxh3
}
