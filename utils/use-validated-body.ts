import defu from 'defu'
import { type H3Event, type EventHandlerRequest, readFormData, readBody, createError, readMultipartFormData, type MultiPartData } from 'h3'
import type { ZodType } from 'zod'

type OutputWithFiles<Output> = Output & {
  getFile?: (name: string) => MultiPartData | null | undefined;
  hasFile?: (name: string) => boolean | null | undefined;
  _multipartBody?: any;
}

export const useValidatedBody = async<Output = any, _Input = any>(
  event: H3Event<EventHandlerRequest>,
  zodSchema: ZodType<Output> | false,
): Promise<OutputWithFiles<Output>> => {
  const checkBody = await readBody(event)
  if (!checkBody) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Terdapat Kesalahan pada data yang dikirim',
    })
  }
  const contentType = event.headers.get('content-type')?.toLowerCase()
  let body
  switch (true) {
    case contentType === 'application/x-www-form-urlencoded': {
      const formData = await readFormData(event) as unknown as Iterable<[unknown, FormDataEntryValue]>
      body = Object.fromEntries(formData)
      break
    }
    case contentType === 'application/json':
      body = await readBody(event)
      break
    case contentType?.startsWith('multipart/form-data'): {
      const formData = await readFormData(event) as unknown as Iterable<[unknown, FormDataEntryValue]>
      body = Object.fromEntries(formData)
      if (body.bodyJson) {
        try {
          body = defu(body, JSON.parse(body.bodyJson))
          delete body.bodyJson
        }
        catch (err) {
          console.log(err)
        }
      }
      const multipartBody = await readMultipartFormData(event)
      const files = multipartBody?.reduce<{ [key: string]: MultiPartData }>((result, current) => {
        if (current.type)
          return { ...result, ...{ [current.name!]: current } }
        return result
      }, {})
      body._multipartBody = files
      break
    }
    default: {
      const formData = await readFormData(event) as unknown as Iterable<[unknown, FormDataEntryValue]>
      body = Object.fromEntries(formData)
      break
    }
  }
  if (zodSchema !== false) {
    const result = await zodSchema.safeParseAsync(body)
    if (result.success) {
      let data = result.data as OutputWithFiles<Output>
      if (body._multipartBody) {
        data._multipartBody = body._multipartBody
        data.getFile = function (name: string): MultiPartData {
          return this._multipartBody[name] ?? null
        }
        data.hasFile = function (name: string): boolean {
          return Object.keys(this._multipartBody).includes(name)
        }
      }
      return data
    }
    else {
      const issues = result.error.issues?.reduce((validation, row) => {
        const key = row.path.join('.') as string
        return { ...validation, ...{ [key]: row.message } }
      }, {})
      throw createError({
        statusCode: 422,
        statusMessage: 'Terdapat Kesalahan Pada Isian',
        data: issues,
      })
    }
  }
  return body
}