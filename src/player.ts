import { RedisClient } from 'redis'
import { RedisObject } from './redis-object'
import { Pile } from './pile'

class Player extends RedisObject {
  hand: Pile
  credits: number
  currentBet: number
  position: number

  constructor(
    client: RedisClient,
    key: string,
    private defaultCredits = 20,
    private defaultPosition = 0
  ) {
    super(client, key)
    this.hand = new Pile(client, `${key}:hand`)
  }

  get active(): boolean {
    return this.credits > 0
  }

  bet(amount: number) {
    if (amount > this.credits) {
      throw new Error(`Player ${this.key} only have ${this.credits} credits.`)
    }
    this.currentBet += amount
    this.credits -= amount
  }

  async load() {
    await this.hand.load()
    await this.loadProperty('credits', this.defaultCredits, parseInt)
    await this.loadProperty('currentBet', 0, parseInt)
    await this.loadProperty('position', this.defaultPosition, parseInt)
  }

  async save() {
    await this.hand.save()
    await this.saveProperty('credits')
    await this.saveProperty('currentBet')
    await this.saveProperty('position')
  }
}

export { Player }