const _ = require('lodash')
const asyncClass = require('simple-async-class')
const Promise = require('bluebird')
const uuid = require('node-uuid')
const Card = require('./card')

class Deck {

  constructor(redisClient, key) {
    this.client = redisClient
    this.key = key
    this.cards = []    
  }

  get count() {
    return this.cards.length;
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

  * load() {
    if (!this.key) {
      this.key = uuid.v4()
    }
    yield this._load()
  }

  * save() {
    yield this.client.setAsync(this.key + ':cards', JSON.stringify(this.cards))
  }

  * delete() {
    yield this.client.delAsync(this.key + ':cards')
  }

  * _load() {
    const cardsJSON = yield this.client.getAsync(this.key + ':cards')
    if(cardsJSON) {
      this._initCards(JSON.parse(cardsJSON))
    } else {
      this._initCards()
      yield this.save()
    }
  }


  _initCards(cards) {
    if(!cards) {
      _.forEach(Card.Suits, (suit) => {
        _.forEach(Card.Values, (value) => {
          this.cards.push(new Card(value + suit))
        })
      })

    } else {
      _.forEach(cards, (card) => {
        this.cards.push(new Card(card))
      })
    }
  }

}

module.exports = asyncClass(Deck)