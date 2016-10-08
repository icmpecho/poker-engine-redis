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

  get isInprogress(): boolean {
    return this._state >= State.preflop && this._state < State.endOfRound
  }

  get highestBet(): number {
    const bets = this.players.map(x => x.currentBet)
    return _.max(bets)
  }

  get activePlayers(): Player[] {
    return this.players.filter(x => x.isActive)
  }

  get waitingPlayers(): Player[] {
    return this.players.filter(x => x.isWaiting)
  }

  get underBetPlayers(): Player[] {
    return this.activePlayers.filter(x => x.currentBet < this.highestBet)
  }

  get isDoneBetting(): boolean {
    const waitingPlayerExists = this.waitingPlayers.length > 0
    const underBetPlayerExists = this.underBetPlayers.length > 0
    return !(waitingPlayerExists || underBetPlayerExists)
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
      if (p.isActive) this.dealCard(p.hand, 2)
    })
    this.players[this.smallBlindPosition].bet(1)
    this.players[this.bigBlindPosition].bet(2)
    this.currentPosition = this.nextPosition(this.bigBlindPosition)
    this._state = State.preflop
  }

  fold(playerId: string): void {
    this.verifyTurn(playerId)
    this.currentPlayer.fold()
    this.processTurn()
  }

  check(playerId: string): void {
    this.verifyTurn(playerId)
    const highestBet = this.highestBet
    if (this.currentPlayer.currentBet < highestBet) {
      throw new Error(`Can not check, highest bet is ${highestBet}`)
    }
    this.currentPlayer.bet(0)
    this.processTurn()
  }

  call(playerId: string): void {
    this.verifyTurn(playerId)
    const highestBet = this.highestBet
    const currentBet = this.currentPlayer.currentBet
    if (currentBet >= highestBet) {
      throw new Error(`This player is already the highest bet`)
    }
    this.currentPlayer.bet(highestBet - currentBet)
    this.processTurn()
  }

  raise(playerId: string, targetValue: number): void {
    this.verifyTurn(playerId)
    const highestBet = this.highestBet
    const currentBet = this.currentPlayer.currentBet
    if (targetValue <= highestBet) {
      throw new Error(`Invalid raise target ${targetValue}, highest bet is ${highestBet}`)
    }
    this.currentPlayer.bet(targetValue - currentBet)
    this.processTurn()
  }

  allIn(playerId: string): void {
    this.verifyTurn(playerId)
    this.currentPlayer.bet(this.currentPlayer.credits)
    this.processTurn()
  }

  getPlayer(playerId: string): Player {
    const playerKey = this.playerKey(playerId)
    return _.find(this.players, ['key', playerKey])
  }

  playerId(player: Player): string {
    return /^.*:players:(.*)$/g.exec(player.key)[1] 
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
    await this.loadProperty('defaultCredits', this.defaultCredits, parseInt)
  }

  async save() {
    await this.deck.save()
    await this.sharedCards.save()
    await this.saveProperty('_state')
    await Bluebird.map(this.players, p => p.save())
    await this.saveProperty('buttonPosition')
    await this.saveProperty('currentPosition')
    await this.saveProperty('defaultCredits')
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
    while(!this.players[result].isActive) {
      result = this.increasePosition(result)
    }
    return result
  }

  private verifyTurn(playerId: string): void {
    if (!this.isInprogress) {
      throw new Error(`Game ${this.key} is not in progress`)
    }
    if (this.playerId(this.currentPlayer) != playerId) {
      throw new Error(`It's not ${playerId}'s turn`)
    }
  }

  private processTurn(): void {
    if (!this.isDoneBetting) {
      this.currentPosition = this.nextPosition(this.currentPosition)
    }
  }
}

export { Game }