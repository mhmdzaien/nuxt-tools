import defu from 'defu'
import type { Sequelize, QueryOptions, Order, WhereOptions } from 'sequelize'
import { QueryTypes } from 'sequelize'
import type { Knex } from 'knex'
import knex from 'knex'
import type { KnexSequelize, QueryGenerator, RawQueryResult } from '../types'

let _sequelize: Sequelize
let _queryGenerator: QueryGenerator
let _builder: KnexSequelize

const methodToQueryTypes: { [key: string]: string } = {
  select: QueryTypes.SELECT,
  update: QueryTypes.UPDATE,
  insert: QueryTypes.INSERT,
  delete: QueryTypes.DELETE,
}

knex.QueryBuilder.extend('sequelizeWhere', function (where: WhereOptions) {
  const sql = _queryGenerator?.whereQuery(where) as string
  this.where(_builder.raw(sql.replace('WHERE', '')))
  return this
})

knex.QueryBuilder.extend('sequelizeOrder', function (order?: Order) {
  if (order) {
    const sql = _queryGenerator
      .selectQuery('DUMP', { order: order })
      .replace(';', '') as string
    this.orderByRaw(_builder.raw(sql.split('ORDER BY').at(1)!))
  }
  return this
})

export const initConnection = (connection: Sequelize) => {
  _sequelize = connection
  _builder = knex({ client: connection.getDialect() }) as KnexSequelize
  _queryGenerator = connection.getQueryInterface().queryGenerator as QueryGenerator
}

export const raw = (
  sql: string,
  bindings?: Knex.RawBinding[] | Knex.ValueDict,
) => {
  if (bindings) return _builder.raw(sql, bindings)
  return _builder.raw(sql)
}

export const runQuery = async <T extends QueryTypes>(
  query: (builder: KnexSequelize) => Knex.QueryBuilder,
  options?: QueryOptions,
): Promise<RawQueryResult<T>> => {
  const sql = query(_builder).toSQL()
  const queryType = methodToQueryTypes[sql.method]
  return _sequelize.query(
    sql.sql,
    defu(
      {
        replacements: sql.bindings as [],
        type: queryType ?? QueryTypes.SELECT,
      },
      options,
    ),
  ) as unknown as RawQueryResult<T>
}