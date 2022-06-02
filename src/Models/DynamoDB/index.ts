import type { DynamoDBContract, Query, Table } from '@ioc:Adonis/Addons/DynamoDB'

const DynamoDBModel = (Client: DynamoDBContract, tableName: string): typeof Table => {
  @Client.$Table({
    name: tableName
  })
  class $Cache extends Client.Table {
    @Client.$PrimaryKey('Key')
    public static readonly primaryKey: Query.PrimaryKey<$Cache, string, void>

    @Client.Attribute.String()
    public Key: string

    @Client.Attribute.String()
    public Value: string

    @Client.Attribute.Date({ timeToLive: true })
    public ExpiresAt: number | Date
  }

  return $Cache
}

export default DynamoDBModel
