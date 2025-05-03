import {expect, test} from '@jest/globals'
import path from 'path'
import fs from 'fs'

const packageJson = require('../package.json')

function getModuleName(module: string) {
  return module.replace('.', packageJson.name)
}

describe('package.json should exports correctly things', () => {
  Object.keys(packageJson.exports).forEach(key => {
    const value: {import?: string; require?: string; types?: string} =
      packageJson.exports[key]

    test(`should correctly define import, require and types for key '${key}'`, () => {
      expect(value.import).toBeDefined()
      expect(fs.existsSync(path.resolve(__dirname, '.. ', value.import!)))
        .toBeTruthy
      expect(value.require).toBeDefined()
      expect(fs.existsSync(path.resolve(__dirname, '.. ', value.require!)))
        .toBeTruthy
      expect(value.types).toBeDefined()
      expect(fs.existsSync(path.resolve(__dirname, '.. ', value.types!)))
        .toBeTruthy
      expect(value.types?.endsWith('.d.ts')).toBeTruthy
    })
    test(`#require statements ${getModuleName(key)} should correctly work`, () => {
      expect(value.require).toBeDefined()
      const module = require(getModuleName(value.require!))
      expect(module).toBeDefined()
    })
    test(`#import statements ${getModuleName(key)} should correctly work (${getModuleName(value.import!)})`, async () => {
      expect(value.import).toBeDefined()
      // eslint-disable-next-line node/no-unsupported-features/es-syntax
      const module = await import(getModuleName(value.import!))
      expect(module).toBeDefined()
    })
  })
})
