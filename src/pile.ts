import * as _ from 'lodash'
import { RedisClient } from 'redis'
import { Card } from './card'
import { RedisObject } from './redis-object'

class Pile extends RedisObject {

  private cards: Card[];

  constructor(
    redisClient: RedisClient, key: string, private defaultCards: Card[] = []
  ) {
    super(redisClient, key)
    this.defaultCards = defaultCards
    this.cards = []
  }

  get count() {
    return this.cards.length;
  }

  async add(card: Card) {
    this.cards.push(card)
    await this.save()
  }

  async shuffle() {
    this.cards = _.shuffle(this.cards)
    await this.save()
  }

  async draw() {
    const card = this.cards.pop()
    await this.save()
    return card
  }

  async save() {
    await this.saveProperty('cards')
  }

  async load() {
    await this.loadProperty('cards', this.defaultCards, this._parseCards)
    await this.save()
  }

  _parseCards(cardsJSON: string) {
    let cards: Card[] = []
    _.forEach(JSON.parse(cardsJSON), (rawCard) => {
      cards.push(new Card(rawCard))
    })
    return cards
  }
}

export { Pile }
