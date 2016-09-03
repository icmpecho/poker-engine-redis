const _ = require('lodash')
const { Card, Suits, Values } = require('./card')

class Deck {

  constructor() {
    this.cards = []
    _.forEach(Suits, (suit) => {
      _.forEach(Values, (value) => {
        this.cards.push(new Card(suit, value))
      })
    })
  }

}

module.exports = {
  Deck: Deck,
}