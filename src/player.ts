import * as Bluebird from 'bluebird'
import { RedisClient } from 'redis'
import { RedisObject } from './redis-object'
import { Pile } from './pile'

enum State {
  waiting,
  played,
  allin,
  fold,
}

class Player extends RedisObject {
  hand: Pile
  credits: number
  currentBet: number
  position: number
  private _state: State

  constructor(
    client: RedisClient,
    key: string,
    private defaultCredits = 20,
    private defaultPosition = 0
  ) {
    super(client, key)
    this.hand = new Pile(client, `${key}:hand`)
  }

  get isActive(): boolean {
    return this.credits > 0 && this._state != State.fold
  }

  get isWaiting(): boolean {
    return this._state == State.waiting
  }

  get isAllIn(): boolean {
    return this._state == State.allin
  }

  get state(): string {
    return State[this._state]
  }

  bet(amount: number) {
    if (amount >= this.credits) {
      amount = this.credits
      this._state = State.allin
    } else {
      this._state = State.played
    }
    this.currentBet += amount
    this.credits -= amount
  }

  fold(): void {
    this._state = State.fold
  }

  newRound(): void {
    this.currentBet = 0
    this._state = this.credits > 0 ? State.waiting : State.fold
    this.hand.restoreDefault()
  }

  async load() {
    await Bluebird.all<any>([
      this.hand.load(),
      this.loadProperty('credits', this.defaultCredits, parseInt),
      this.loadProperty('currentBet', 0, parseInt),
      this.loadProperty('position', this.defaultPosition, parseInt),
      this.loadProperty('_state', State.waiting, parseInt),
    ])
  }

  async save() {
    await Bluebird.all<any>([
      this.hand.save(),
      this.saveProperty('credits'),
      this.saveProperty('currentBet'),
      this.saveProperty('position'),
      this.saveProperty('_state'),
    ])
  }
}

export { Player }