import * as _ from 'lodash'
import { RedisClient } from 'redis'
import { Card } from './card'
import { RedisObject } from './redis-object'

class Pile extends RedisObject {

  cards: Card[];

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

  add(card: Card) {
    this.cards.push(card)
  }

  shuffle() {
    this.cards = _.shuffle(this.cards)
  }

  draw() {
    const card = this.cards.pop()
    return card
  }

  async save() {
    await this.saveProperty('cards')
  }

  async load() {
    await this.loadProperty('cards', this.defaultCards, this._parseCards)
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
