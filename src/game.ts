import * as _ from 'lodash'
import * as Bluebird from 'bluebird'
import { RedisClient } from 'redis'
import { RedisObject } from './redis-object'
import { Pile } from './pile'
import { Card } from './card'
import { Player } from './player'

enum State {
  idle,
  preparing,
  preflop,
  theFlop,
  theTurn,
  theRiver,
  endOfRound,
  end
}

class Game extends RedisObject {
  deck: Pile
  players: Player[]
  sharedCards: Pile
  buttonPosition: number
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

  get currentPlayer(): Player {
    return this.players[this.currentPosition]
  }

  get smallBlindPosition(): number {
    return this.nextPosition(this.buttonPosition)
  }

  get bigBlindPosition(): number {
    return this.nextPosition(this.smallBlindPosition)
  }

  init(): void {
    if (this._state != State.idle) {
      throw new Error(`Game ${this.key} is already in ${State[this._state]} state.`)
    }
    this._state = State.preparing
  }

  start(): void {
    if ((this._state != State.preparing) && (this._state != State.endOfRound)) {
      throw new Error(`Game ${this.key} is not ready to start.`)
    }
    this.deck.restoreDefault()
    this.players.forEach(p => p.newRound())
    this.sharedCards.restoreDefault()
    this.deck.shuffle()
    this.buttonPosition = this.nextPosition(this.buttonPosition)
    this.players.forEach(p => {
      if (p.active) this.dealCard(p.hand, 2)
    })
    this.players[this.smallBlindPosition].bet(1)
    this.players[this.bigBlindPosition].bet(2)
    this.currentPosition = this.nextPosition(this.bigBlindPosition)
    this._state = State.preflop
  }

  getPlayer(playerId: string): Player {
    const playerKey = this.playerKey(playerId)
    return _.find(this.players, ['key', playerKey])
  }

  async addPlayer(playerId: string) {
    const playerKey = this.playerKey(playerId)
    if (this._state != State.preparing) {
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
    await this.loadProperty('buttonPosition', null, JSON.parse)
    await this.loadProperty('currentPosition', null, JSON.parse)
  }

  async save() {
    await this.deck.save()
    await this.sharedCards.save()
    await this.saveProperty('_state')
    await Bluebird.map(this.players, p => p.save())
    await this.saveProperty('buttonPosition')
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
    _.times(count, () => {
      const card = this.deck.draw()
      target.add(card)
    }) 
  }

  private increasePosition(position: number|null|undefined): number {
    if(_.isNil(position)) {
      return 0
    }
    let result = position + 1
    if (result >= this.players.length) {
      result = 0
    }
    return result
  }

  private nextPosition(position: number|null|undefined): number {
    let result = this.increasePosition(position)
    while(!this.players[result].active) {
      result = this.increasePosition(result)
    }
    return result
  }
}

export { Game }