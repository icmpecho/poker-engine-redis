const _ = require('lodash')
const asyncClass = require('simple-async-class')
const Promise = require('bluebird')
const Card = require('./card')
const Pile = require('./pile')

class Deck extends Pile{

  constructor(redisClient, key) {
    super(redisClient, key)
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