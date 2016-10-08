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

interface Pot {
  value: number,
  excludedPlayerIds?: string[],
}

class Game extends RedisObject {
  deck: Pile
  players: Player[]
  sharedCards: Pile
  buttonPosition: number
  currentPosition: number
  pots: Pot[]
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

  get allInPlayers(): Player[] {
    return this.players.filter(x => x.isAllIn)
  }

  get currentPot(): Pot {
    return this.pots[this.pots.length - 1]
  }

  get isDoneBetting(): boolean {
    const waitingPlayerExists = this.waitingPlayers.length > 0
    const underBetPlayerExists = this.underBetPlayers.length > 0
    return !(waitingPlayerExists || underBetPlayerExists)
  }

  get isEnoughActivePlayers(): boolean {
    return this.activePlayers.length > 1
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
    await Bluebird.all<any>([
      this.deck.load(),
      this.sharedCards.load(),
      this.loadProperty('_state', State.idle, parseInt),
      this.loadPlayers(),
      this.loadProperty('buttonPosition', null, JSON.parse),
      this.loadProperty('currentPosition', null, JSON.parse),
      this.loadProperty('defaultCredits', this.defaultCredits, parseInt),
      this.loadProperty('pots', [{ value: 0 }], JSON.parse),
    ])
  }

  async save() {
    await Bluebird.all<any>([
      this.deck.save(),
      this.sharedCards.save(),
      this.saveProperty('_state'),
      Bluebird.map(this.players, p => p.save()),
      this.saveProperty('buttonPosition'),
      this.saveProperty('currentPosition'),
      this.saveProperty('defaultCredits'),
      this.saveProperty('pots'),
    ])
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
      return
    }
    this.endBettingRound()
  }

  private endBettingRound(): void {
    this.collectBets()
    if (!this.isEnoughActivePlayers || this._state == State.theRiver) {
      this.endRound()
      return
    }
    this.newBettingRound()
  }

  private newBettingRound(): void {
    this._state += 1
    switch (this._state) {
      case State.theFlop:
        this.dealCard(this.sharedCards, 3)
        break;
      case State.theTurn:
        this.dealCard(this.sharedCards)
        break;
      case State.theRiver:
        this.dealCard(this.sharedCards)
        break;
      default:
        throw new Error(`invalid state for newBettingRound: ${this.state}`)
    }
    this.players.forEach(p => p.newBettingRound())
    this.currentPosition = this.nextPosition(this.buttonPosition)
  }

  private endRound(): void {

  }

  private collectBets(): void {
    const allInPlayers = this.allInPlayers

    if (allInPlayers.length > 0) {
      const sortedAllInPlayers = _.sortBy(allInPlayers, ['currentBet'])

      sortedAllInPlayers.forEach(allInPlayer => {
        const allInValue = allInPlayer.currentBet
        this.currentPot.value += allInValue
        allInPlayer.currentBet = 0

        this.players.forEach(p => {
          if(p.currentBet < allInValue) {
            this.currentPot.value += p.currentBet
            p.currentBet = 0
          } else {
            this.currentPot.value += allInValue
            p.currentBet = p.currentBet - allInValue
          }
        })

        const excludedPlayerIds = _.cloneDeep(this.currentPot.excludedPlayerIds) || []
        excludedPlayerIds.push(this.playerId(allInPlayer))
        this.pots.push({ value: 0, excludedPlayerIds: excludedPlayerIds })
      })
    }

    this.players.forEach(p => {
      this.currentPot.value += p.currentBet
      p.currentBet = 0
    })
  }
}

export { Game }