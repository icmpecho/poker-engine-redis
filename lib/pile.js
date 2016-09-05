const _ = require('lodash')
const asyncClass = require('simple-async-class')
const Promise = require('bluebird')
const Card = require('./card')
const RedisObject = require('./redis-object')

class Pile extends RedisObject {

  constructor(redisClient, key) {
    super(redisClient, key)
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
    yield this.saveProperty('cards')
  }

  * load() {
    yield this.loadProperty('cards', this.defaultCards(), this._parseCards)
    yield this.save()
  }

  defaultCards() {
    return []
  }

  _parseCards(cardsJSON) {
    let cards = []
    _.forEach(JSON.parse(cardsJSON), (rawCard) => {
      cards.push(new Card(rawCard))
    })
    return cards
  }
}

module.exports = asyncClass(Pile)
