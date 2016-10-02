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
  endOfRound,
  end
}

class Game extends RedisObject {
  deck: Pile
  players: Player[]
  sharedCards: Pile
  startingPosition: number
  currentPosition: number
  private _state: State
  constructor(client: RedisClient, key: string, public defaultCredits = 20) {
    super(client, key)
    this.deck = new Pile(client, `${key}:deck`, Card.all)
    this.sharedCards = new Pile(client, `${key}:sharedCards`)
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

  start(): void {
    if ((this._state != State.starting) && (this._state != State.endOfRound)) {
      throw new Error(`Game ${this.key} is not ready to start.`)
    }
    this.deck.restoreDefault()
    this.sharedCards.restoreDefault()
    this.deck.shuffle()
    this.nextStartingPosition()
    this.players.forEach(p => {
      p.hand.restoreDefault()
      this.dealCard(p.hand, 2)
    })
    this._state = State.ongoing
  }

  getPlayer(playerId: string): Player {
    const playerKey = this.playerKey(playerId)
    return _.find(this.players, ['key', playerKey])
  }

  async addPlayer(playerId: string) {
    const playerKey = this.playerKey(playerId)
    if (this._state != State.starting) {
      throw new Error(`Game ${this.key} is not accepting new player right now.`)
    }
    if (this.getPlayer(playerId)) {
      throw new Error(`Player ${playerId} is already in ${this.key} game.`)
    }
    const player = new Player(this.client, playerKey, this.defaultCredits, this.players.length)
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
    await this.sharedCards.load()
    await this.loadProperty('_state', State.idle, parseInt)
    await this.loadPlayers()
    await this.loadProperty('startingPosition', null, JSON.parse)
    await this.loadProperty('currentPosition', null, JSON.parse)
  }

  async save() {
    await this.deck.save()
    await this.sharedCards.save()
    await this.saveProperty('_state')
    await Bluebird.map(this.players, p => p.save())
    await this.saveProperty('startingPosition')
    await this.saveProperty('currentPosition')
  }

  private async loadPlayers() {
    const keys = await this.client.keysAsync(`${this.key}:players:*`)
    const playerKeys = _.uniq(keys.map(key => /^(.*:players:.*?)(:|$)/g.exec(key)[1]))
    this.players = playerKeys.map(key => new Player(this.client, key, this.defaultCredits))
    await Bluebird.map(this.players, p => p.load())
    this.players = _.sortBy(this.players, 'position')
  }

  private playerKey(playerId: string): string {
    return `${this.key}:players:${playerId}`
  }

  private dealCard(target: Pile, count=1) {
    const card = this.deck.draw()
    _.times(count, () => target.add(card)) 
  }

  private _nextStartingPosition(): void {
    if (_.isNil(this.startingPosition)) {
      this.startingPosition = 0
    }
    this.startingPosition += 1
    if (this.startingPosition >= this.players.length) {
      this.startingPosition = 0
    }
  }

  private nextStartingPosition(): void {
    this._nextStartingPosition()
    while(this.players[this.startingPosition].credits <= 0) {
      this._nextStartingPosition()
    }
  }
}

export { Game }