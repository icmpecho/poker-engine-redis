import { RedisClient } from 'redis'
import { RedisObject } from './redis-object'
import { Pile } from './pile'

class Player extends RedisObject {
  hand: Pile
  private _key: string

  constructor(client: RedisClient, key: string) {
    super(client, key)
    this._key = key
    this.hand = new Pile(client, `${key}:hand`)
  }

  async load() {
    await this.hand.load()
  }

  async save() {
    await this.hand.save()
  }
}

export { Player }