import type { Knex } from 'knex'
import type { FindAttributeOptions, FindOptions, Model, ModelStatic, Order, QueryTypes, TableName, WhereOptions } from 'sequelize'
import type { CacheSerializer } from 'persistent-node-cache'

export type KnexSequelize = Knex.QueryBuilder & {
  sequelizeOrder(order?: Order): KnexSequelize
  sequelizeWhere(where?: WhereOptions): KnexSequelize
}
export interface QueryGenerator {
  whereQuery(where: WhereOptions): string
  selectQuery<M extends Model>(tableName: TableName, options?: FindOptions, model?: ModelStatic<M>): string
}

export interface FilterQuery {
  page?: string
  rowsPerPage?: string
  where?: object
  search?: object
  sortBy?: string
  sortType?: string
  attributes?: FindAttributeOptions
}

export type RawQueryResult<T> = T extends QueryTypes.SELECT
  ? unknown[]
  : T extends QueryTypes.INSERT
    ? [number, number]
    : T extends QueryTypes.UPDATE
      ? [undefined, number]
      : undefined

export type PersistentNodeCacheOptions = {
  cacheName: string
  period?: number
  dir?: string
  opts?: unknown
  serializer?: CacheSerializer
}

export type KeyVSqliteOptions = {
  dir?: string
  table?: string
}