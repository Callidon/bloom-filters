import XXH from '@node-rs/xxhash'
import Hashing, {type XXH as XXHType} from './hashing.mjs'
Hashing.lib = XXH as XXHType
export * from './api.mjs'
