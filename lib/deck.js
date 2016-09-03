const _ = require('lodash')
const Card = require('./card')

class Deck {

  constructor() {
    this.cards = []
    _.forEach(Card.Suits, (suit) => {
      _.forEach(Card.Values, (value) => {
        this.cards.push(new Card(suit, value))
      })
    })
  }

}

module.exports = Deck