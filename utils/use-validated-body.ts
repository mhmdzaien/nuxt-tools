import defu from 'defu'
import { type H3Event, type EventHandlerRequest, readFormData, readBody, createError, readMultipartFormData } from 'h3'
import type { ZodType, ZodTypeDef } from 'zod'

export const useValidatedBody = async<Output = unknown & { getFile?(): File, hasFile?(): boolean }, _Def extends ZodTypeDef = ZodTypeDef, _Input = Output>(
  event: H3Event<EventHandlerRequest>,
  zodSchema: ZodType<Output, _Def, _Input> | false,
): Promise< Output > => {
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
    case contentType === 'application/x-www-form-urlencoded':{
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
      const files = multipartBody?.reduce((result, current) => {
        if (current.type)
          return { ...result, ...{ [current.name!]: current } }
        else return result
      }, {})
      body._multipartBody = files
      break
    }
    default:{
      const formData = await readFormData(event) as unknown as Iterable<[unknown, FormDataEntryValue]>
      body = Object.fromEntries(formData)
      break
    }
  }
  if (zodSchema !== false) {
    const result = await zodSchema.safeParseAsync(body)
    if (result.success) {
      if (body._multipartBody) {
        result.data._multipartBody = body._multipartBody
        result.data.getFile = function (name: string): File {
          return this._multipartBody[name] ?? null
        }
        result.data.hasFile = function (name: string): boolean {
          return Object.keys(this._multipartBody).includes(name)
        }
      }
      return result.data
    }
    else {
      throw createError({
        statusCode: 422,
        statusMessage: 'Terdapat Kesalahan Pada Isian',
        data: result.error.issues,
      })
    }
  }
  return body
}