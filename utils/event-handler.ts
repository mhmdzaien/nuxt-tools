import type { User } from '#auth-utils'
import type { Hooks } from 'crossws'

import {
    type EventHandler,
    type EventHandlerResolver,
    type EventHandlerResponse,
    type EventHandlerRequest,
    type H3Event,
    type H3EventContext,
    defineEventHandler,
    setResponseStatus,
} from 'h3'
import type { Sequelize } from 'sequelize'
import type { ZodIssue } from 'zod'

interface MyH3EventContext extends H3EventContext {
    sequelize: Sequelize
}

export type AuthorizeRequest = '*' | Array<number> | ((user: User) => boolean)
export interface MyH3Event<T extends EventHandlerRequest> extends H3Event<T> {
    context: MyH3EventContext
}
export interface MyEventHandler<
    Request extends EventHandlerRequest = EventHandlerRequest,
    Response extends EventHandlerResponse = EventHandlerResponse,
> {
    __is_handler__?: true
    __resolve__?: EventHandlerResolver
    __websocket__?: Partial<Hooks>
    (event: MyH3Event<Request>): Response
}

export const defineMyEventHandler = <T extends EventHandlerRequest, D>(
    handler: MyEventHandler<T, D>,
    authorizeRequest?: AuthorizeRequest,
): EventHandler<T, D> =>
    defineEventHandler<T>(async (event) => {
        try {
            if (authorizeRequest && authorizeRequest !== '*') {
                const { user }: any = await requireUserSession(event);
                if (
                    Array.isArray(authorizeRequest)
                    && !authorizeRequest.includes(user.value!.role as number)
                ) {
                    throw {
                        statusCode: 403,
                        message: 'Anda tidak memiliki akse ke fitur ini',
                    }
                } else if (typeof authorizeRequest === 'function' && !authorizeRequest(user)) {
                    throw {
                        statusCode: 403,
                        message: 'Anda tidak memiliki akses ke fitur ini',
                    }
                }
            }
            return await handler(event as MyH3Event<T>)
        }
        catch (err) {
            const error = err as unknown as { code: number, message: string, statusCode: number, data?: any, stack: unknown, statusMessage?: string }
            setResponseStatus(event, error.statusCode ?? 500)
            console.log(error.stack)
            return {
                code: error.code ?? error.statusCode,
                message: error.statusMessage ?? error.message,
                details: error.data,
            }
        }
    })