// This file is used to boostrap all tests.
// only jest.test close is working

import { beforeAll } from '@jest/globals'
import boostrap from '../src/bootstrap'
beforeAll(async () => {
    return await boostrap()
})
