import { RedisClient } from 'redis'
import { RedisObject } from './redis-object'
import { Pile } from './pile'
import { Card } from './card'

enum State {
  idle,
  starting,
  ongoing,
  end
}

class Game extends RedisObject {
  deck: Pile
  private _state: State
  private _key: string
  constructor(client: RedisClient, key: string) {
    super(client, key)
    this._key = key
    this.deck = new Pile(client, `${key}:deck`, Card.all)
  }

  get state(): string {
    return State[this._state]
  }

  init(): void {
    if (this._state != State.idle) {
      throw new Error(`Game ${this._key} is already in ${State[this._state]} state.`)
    }
    this._state = State.starting
  }

  async reset() {
    const keys = await this.client.keysAsync(`${this._key}:*`)
    await this.client.delAsync(keys)
    await this.load()
  }

  async load() {
    await this.deck.load()
    await this.loadProperty('_state', State.idle, parseInt)
  }

  async save() {
    await this.deck.save()
    await this.saveProperty('_state')
  }
}

export { Game }