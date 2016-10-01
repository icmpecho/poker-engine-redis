import { RedisClient } from 'redis'
import { RedisObject } from './redis-object'
import { Pile } from './pile'

class Player extends RedisObject {
  hand: Pile
  credits: number
  private _key: string

  constructor(client: RedisClient, key: string, private defaultCredits = 20) {
    super(client, key)
    this._key = key
    this.hand = new Pile(client, `${key}:hand`)
  }

  async load() {
    await this.hand.load()
    await this.loadProperty('credits', this.defaultCredits, parseInt)
  }

  async save() {
    await this.hand.save()
    await this.saveProperty('credits')
  }
}

export { Player }