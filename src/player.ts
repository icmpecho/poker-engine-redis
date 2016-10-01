import { RedisClient } from 'redis'
import { RedisObject } from './redis-object'
import { Pile } from './pile'

class Player extends RedisObject {
  hand: Pile
  credits: number
  currentBet: number
  private _key: string

  constructor(client: RedisClient, key: string, private defaultCredits = 20) {
    super(client, key)
    this._key = key
    this.hand = new Pile(client, `${key}:hand`)
  }

  bet(amount: number) {
    if (amount > this.credits) {
      throw new Error(`Player ${this._key} only have ${this.credits} credits.`)
    }
    this.currentBet += amount
    this.credits -= amount
  }

  async load() {
    await this.hand.load()
    await this.loadProperty('credits', this.defaultCredits, parseInt)
    await this.loadProperty('currentBet', 0, parseInt)
  }

  async save() {
    await this.hand.save()
    await this.saveProperty('credits')
    await this.saveProperty('currentBet')
  }
}

export { Player }