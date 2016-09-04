const _ = require('lodash')
const Card = require('./card')

class Deck {

  constructor() {
    this.cards = []
    _.forEach(Card.Suits, (suit) => {
      _.forEach(Card.Values, (value) => {
        this.cards.push(new Card(value + suit))
      })
    })
  }


  get count() {
    return this.cards.length;
  }

  shuffle() {
    this.cards = _.shuffle(this.cards)
  }

  draw() {
    return this.cards.pop()
  }

}

module.exports = Deck