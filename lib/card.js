class Card {

  constructor(suit, value) {
    this.suit = suit
    this.value = value
  }

  toString() {
    return this.value + '-' + this.suit
  }

}

const suits = {
  spade: 'S',
  heart: 'H',
  diamond: 'D',
  club: 'C',
}

const values = [
  '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A',
]

module.exports = {
  Card: Card,
  Suits: suits,
  Values: values,
}
