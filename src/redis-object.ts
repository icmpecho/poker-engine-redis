import { RedisClient } from 'redis'
import * as Bluebird from 'bluebird'

interface Serializer {
  (input: any): string
}

interface Parser {
  (input: string): any
}

interface PromisifyRedis extends RedisClient {
  setAsync(key: string, value: string): Bluebird<string>
  getAsync(key: string): Bluebird<string>
  flushdbAsync(): Bluebird<any>
  delAsync(keys: string[]): Bluebird<any>
  keysAsync(pattern: string): Bluebird<string[]>
}

class RedisObject {
  [attrName: string]: any
  client: PromisifyRedis

  constructor(client: RedisClient, public key: string) {
    this.client = <PromisifyRedis>Bluebird.promisifyAll(client);
  }

  propertyKey(name: string) {
    return `${this.key}:${name}`
  }

  async saveProperty(name: string, serializer: Serializer = JSON.stringify) {
    await this.client.setAsync(this.propertyKey(name), serializer(this[name]))
  }

  async loadProperty(name: string, defaultValue: any, parser: Parser) {
    const property = await this.client.getAsync(this.propertyKey(name))
    if (property) {
      this[name] = parser(property)
    } else {
      this[name] = defaultValue
    }
  }
}

export { RedisObject, PromisifyRedis }
