import { RedisClient } from 'redis'
import { RedisObject } from './redis-object'
import { Pile } from './pile'
import { Card } from './card'

class Game extends RedisObject {
  deck: Pile
  constructor(client: RedisClient, key: string) {
    super(client, key)
    this.deck = new Pile(client, `${key}:deck`, Card.all)
  }

  async load() {
    await this.deck.load()
  }

  async save() {
    await this.deck.save()
  }
}

export { Game }