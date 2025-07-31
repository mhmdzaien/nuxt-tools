import type {
  Dialect } from 'sequelize'
import {
  Sequelize,
} from 'sequelize'
import type { NitroApp } from 'nitropack'
import { defineNitroPlugin } from 'nitropack/dist/runtime/plugin'
import { getHeader, H3Event } from 'h3'
import { initConnection } from '../utils/knex-utils'
//@ts-ignore
import { mySequelizeModelLoad, mySequelizeOptions } from '#my-sequelize-options'

const { connection } = mySequelizeOptions
const _connection: { [key: string]: Sequelize } = {}

const createConnection = (identifier: string) => {
  if (!_connection[identifier]) {
    _connection[identifier] = new Sequelize({
      dialect: connection?.dialect ?? process.env.DB_DRIVER as Dialect ?? 'mysql',
      host: connection?.host ?? process.env.DB_HOST ?? 'localhost',
      username: connection?.username ?? process.env.DB_USER ?? 'root',
      password: connection?.password ?? process.env.DB_PASSWORD ?? '',
      database: connection?.database ?? process.env.DB_NAME ?? '',
      port: Number(connection?.port ?? process.env.DB_PORT ?? '3306'),
      // logging: false,
    })
  }
  initConnection(_connection[identifier])
  return _connection[identifier]
}

const multiTenantDb = (nitroApp: NitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const tenantId = getHeader(event, 'tenant') ?? 'default'
    const connection = createConnection(tenantId)
    event.context.sequelize = connection
    mySequelizeModelLoad(connection)
  })
  nitroApp.hooks.hook('afterResponse', (event) => {
    event.context.sequelize?.close()
  })
}

export const useSequelize = (event: H3Event) => {
    const tenantId = getHeader(event, 'tenant') ?? 'default'
    return createConnection(tenantId)
}

export default defineNitroPlugin((nitroApp: NitroApp) => {
  const moduleOptions = { enabledMultitenant: false }
  if (moduleOptions.enabledMultitenant) {
    multiTenantDb(nitroApp)
  }
  else {
    const connection = createConnection('default')
    nitroApp.hooks.hook('request', (event) => {
      try {
        mySequelizeModelLoad(connection)
        event.context.sequelize = connection
      }
      catch (err) {
        console.log(err)
      }
    })
  }
})