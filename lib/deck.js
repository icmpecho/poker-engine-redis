const _ = require('lodash')
const asyncClass = require('simple-async-class')
const Promise = require('bluebird')
const Card = require('./card')
const Pile = require('./pile')

class Deck extends Pile{

  constructor(redisClient, key) {
    super(redisClient, key)
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

  _initCards(cards) {
    if(!cards) {
      _.forEach(Card.Suits, (suit) => {
        _.forEach(Card.Values, (value) => {
          this.cards.push(new Card(value + suit))
        })
      })

    } else {
      super._initCards(cards)
    }
  }

}

module.exports = asyncClass(Deck)