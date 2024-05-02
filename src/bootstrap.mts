import Hashing from './hashing.mjs'

/**
 * Boostrap our `@node-rs/xxhash` to be used either in node or in the browser
 */
export default () => Hashing.loadLib()
