const _ = require('lodash')
const asyncClass = require('simple-async-class')
const Promise = require('bluebird')
const Card = require('./card')

class Pile {

  constructor(redisClient, key) {
    this.client = redisClient
    this.key = key
    this.cards = []
  }

  get count() {
    return this.cards.length;
  }

  * add(card) {
    this.cards.push(card)
    yield this.save()
  }

  * shuffle() {
    this.cards = _.shuffle(this.cards)
    yield this.save()
  }

  * draw() {
    const card = this.cards.pop()
    yield this.save()
    return card
  }

  * save() {
    yield this.client.setAsync(this.key + ':cards', JSON.stringify(this.cards))
  }

  * load() {
    const cardsJSON = yield this.client.getAsync(this.key + ':cards')
    if(cardsJSON) {
      this._initCards(JSON.parse(cardsJSON))
    } else {
      this._initCards()
      yield this.save()
    }
  }

  _initCards(cards = []) {
    _.forEach(cards, (card) => {
      this.cards.push(new Card(card))
    })
  }
}

module.exports = asyncClass(Pile)
