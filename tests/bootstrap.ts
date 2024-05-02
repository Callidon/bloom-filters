import { beforeAll } from '@jest/globals'
import boostrap from '../src/bootstrap'
beforeAll(async () => {
    return await boostrap()
})