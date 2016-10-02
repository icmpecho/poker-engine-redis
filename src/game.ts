import * as _ from 'lodash'
import * as Bluebird from 'bluebird'
import { RedisClient } from 'redis'
import { RedisObject } from './redis-object'
import { Pile } from './pile'
import { Card } from './card'
import { Player } from './player'

enum State {
  idle,
  starting,
  ongoing,
  end
}

class Game extends RedisObject {
  deck: Pile
  players: Player[]
  private _state: State
  constructor(client: RedisClient, key: string, public defaultCredits = 20) {
    super(client, key)
    this.deck = new Pile(client, `${key}:deck`, Card.all)
    this.players = []
  }

  get state(): string {
    return State[this._state]
  }

  init(): void {
    if (this._state != State.idle) {
      throw new Error(`Game ${this.key} is already in ${State[this._state]} state.`)
    }
    this._state = State.starting
  }

  async addPlayer(playerId: string) {
    const playerKey = `${this.key}:players:${playerId}`
    if (this._state != State.starting) {
      throw new Error(`Game ${this.key} is not accepting new player right now.`)
    }
    if (_.find(this.players, ['key', playerKey])) {
      throw new Error(`Player ${playerId} is already in ${this.key} game.`)
    }
    const player = new Player(this.client, playerKey, this.defaultCredits)
    await player.load()
    this.players.push(player)
  }

  async reset() {
    const keys = await this.client.keysAsync(`${this.key}:*`)
    await this.client.delAsync(keys)
    await this.load()
  }

  async load() {
    await this.deck.load()
    await this.loadProperty('_state', State.idle, parseInt)
    await this.loadPlayers()
  }

  async save() {
    await this.deck.save()
    await this.saveProperty('_state')
    await Bluebird.map(this.players, p => p.save())
  }

  private async loadPlayers() {
    const keys = await this.client.keysAsync(`${this.key}:players:*`)
    const playerKeys = _.uniq(keys.map(key => /^(.*:players:.*?)(:|$)/g.exec(key)[1]))
    this.players = playerKeys.map(key => new Player(this.client, key, this.defaultCredits))
    await Bluebird.map(this.players, p => p.load())
  }
}

export { Game }