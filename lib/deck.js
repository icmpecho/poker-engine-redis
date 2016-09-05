const _ = require('lodash')
const asyncClass = require('simple-async-class')
const Promise = require('bluebird')
const Card = require('./card')
const Pile = require('./pile')

class Deck extends Pile{

  constructor(redisClient, key) {
    super(redisClient, key)
  }

  defaultCards() {
    let cards = []
    _.forEach(Card.Suits, (suit) => {
      _.forEach(Card.Values, (value) => {
        cards.push(new Card(value + suit))
      })
    })
    return cards
  }

}

module.exports = asyncClass(Deck)