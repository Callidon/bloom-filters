/* file : exportable.ts
MIT License

Copyright (c) 2017-2020 Thomas Minier & Arnaud Grall

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
// !disable all rules referring to `any` for exportable because we are dealing with all types so any is allowed
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */

import 'reflect-metadata'

interface ImportExportSpecs<T> {
  export: (instance: T) => any
  import: (json: any) => T
}

/**
 * Clone a field of a filter (array, object or any primary type)
 * @param  {*} v - Value to clone
 * @return {*} Cloned value
 */
export function cloneField(v: any): any {
  if (v === null || v === undefined) {
    return v
  }
  if (Array.isArray(v)) {
    return v.map(cloneField)
  } else if (typeof v === 'object') {
    if ('saveAsJSON' in v) {
      return v.saveAsJSON()
    }
    return Object.assign({}, v)
  }
  return v
}

/**
 * Get a function used to clone an object
 * @param type - Object type
 * @param fields - Object's fields to clone
 * @return A function that clones the given fields of an input object
 */
export function cloneObject(type: string, ...fields: string[]): any {
  return function (obj: any) {
    const json: any = {type}
    fields.forEach(field => {
      json[field] = cloneField(obj[field])
    })
    return json
  }
}

/**
 * Turn a datastructure into an exportable one, so it can be serialized from/to JSON objects.
 * @param specs - An object that describes how the datastructure should be exported/imported
 * @author Thomas Minier
 */
export function Exportable<T>(specs: ImportExportSpecs<T>) {
  return function (target: any) {
    target.prototype.saveAsJSON = function (): any {
      return specs.export(this)
    }
    target.fromJSON = function (json: any): T {
      return specs.import(json)
    }
    return target
  }
}

interface FieldSpec<F> {
  name: string
  exporter: (elt: F) => any
  importer: (json: any) => F
}

type ParameterSpecs = Map<string, number>

const METADATA_CLASSNAME = Symbol('bloom-filters:exportable:class-name')
const METADATA_FIELDS = Symbol('bloom-filters:exportable:fields')
const METADATA_PARAMETERS = Symbol(
  'bloom-filters:exportable:constructor-parameters'
)

/**
 * Register a field to be exportable/importable
 * @param importer - Function invoked on the JSON field to convert it into JavaScript
 */
export function Field<F>(
  exporter?: (elt: F) => any,
  importer?: (json: any) => F
) {
  if (exporter === undefined) {
    exporter = cloneField
  }
  if (importer === undefined) {
    importer = v => v
  }
  return function (target: any, propertyKey: string) {
    let fields: FieldSpec<F>[] = []
    if (Reflect.hasMetadata(METADATA_FIELDS, target)) {
      fields = Reflect.getMetadata(METADATA_FIELDS, target)
    }
    fields.push({
      name: propertyKey,
      exporter: exporter!, // eslint-disable-line @typescript-eslint/no-non-null-assertion
      importer: importer!, // eslint-disable-line @typescript-eslint/no-non-null-assertion
    })
    Reflect.defineMetadata(METADATA_FIELDS, fields, target)
  }
}

export function Parameter(fieldName: string) {
  return function (target: any, propertyKey: string, parameterIndex: number) {
    let parameters: ParameterSpecs = new Map<string, number>()
    if (Reflect.hasMetadata(METADATA_PARAMETERS, target)) {
      parameters = Reflect.getMetadata(METADATA_PARAMETERS, target)
    }
    parameters.set(fieldName, parameterIndex)
    Reflect.defineMetadata(METADATA_PARAMETERS, parameters, target)
  }
}

/**
 * Augment a TypeScript class to make it exportable/importable, using @Field and @Parameter decorator
 * @param className - Name of the exportable/importable class
 */
export function AutoExportable<T>(
  className: string,
  otherFields: string[] = []
) {
  return function (target: any) {
    Reflect.defineMetadata(METADATA_CLASSNAME, className, target.prototype)
    if (
      !Reflect.hasMetadata(METADATA_FIELDS, target.prototype) ||
      otherFields.length === 0
    ) {
      throw new SyntaxError(
        'No exported fields declared when @AutoExportable is called'
      )
    }
    // define empty parameters map, for object with a constructor without parameters
    if (!Reflect.hasMetadata(METADATA_PARAMETERS, target)) {
      Reflect.defineMetadata(METADATA_PARAMETERS, new Map(), target)
    }

    target.prototype.saveAsJSON = function (): any {
      const json: any = {
        type: Reflect.getMetadata(METADATA_CLASSNAME, target.prototype),
      }
      // export fields defined using the @Field decorator
      const fields: FieldSpec<any>[] = Reflect.getMetadata(
        METADATA_FIELDS,
        target.prototype
      )
      fields.forEach(field => {
        json[field.name] = field.exporter(this[field.name])
      })
      // export fields declared through the otherFields parameter
      otherFields.forEach(field => {
        json[field] = cloneField(this[field])
      })
      return json
    }

    target.fromJSON = function (json: any): T {
      const className: string = Reflect.getMetadata(
        METADATA_CLASSNAME,
        target.prototype
      )
      const parameters: ParameterSpecs = Reflect.getMetadata(
        METADATA_PARAMETERS,
        target
      )
      const fields: FieldSpec<any>[] = Reflect.getMetadata(
        METADATA_FIELDS,
        target.prototype
      )
      // validate the input JSON
      if (json.type !== className) {
        throw new Error(
          `Cannot create an object ${className} from a JSON export with type "${json.type}"` // eslint-disable-line @typescript-eslint/restrict-template-expressions
        )
      }
      const constructorArgs: Array<{name: string; value: any}> = []
      const copyFields: Array<{name: string; value: any}> = []

      otherFields
        .map(name => ({name, importer: (v: any) => v}))
        .concat(fields)
        .forEach(field => {
          if (!(field.name in json)) {
            throw new Error(
              `Invalid import: required field "${field}" not found in JSON export "${json}"` // eslint-disable-line @typescript-eslint/restrict-template-expressions
            )
          }
          // build constructor/copy arguments
          if (parameters.has(field.name)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            constructorArgs[parameters.get(field.name)!] = field.importer(
              json[field.name]
            )
          } else {
            copyFields.push({
              name: field.name,
              value: field.importer(json[field.name]),
            })
          }
        })
      // build new object
      const obj = new target(...constructorArgs)
      // write non-constructor exported fields
      copyFields.forEach(arg => {
        obj[arg.name] = arg.value
      })
      return obj
    }
  }
}
