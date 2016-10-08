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
    await this.hand.load()
    await this.loadProperty('credits', this.defaultCredits, parseInt)
    await this.loadProperty('currentBet', 0, parseInt)
    await this.loadProperty('position', this.defaultPosition, parseInt)
    await this.loadProperty('_state', State.waiting, parseInt)
  }

  async save() {
    await this.hand.save()
    await this.saveProperty('credits')
    await this.saveProperty('currentBet')
    await this.saveProperty('position')
    await this.saveProperty('_state')
  }
}

export { Player }