const suits = {
  spade: 0,
  heart: 1,
  diamond: 2,
  club: 3,
}

const values = [
  '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A',
]

class Card {

  constructor(suit, value) {
    this.suit = suit
    this.value = value
  }

  toString() {
    return this.value + this._unicodeSuit(this.suit)
  }

  _unicodeSuit(suit) {
    return String.fromCharCode(parseInt(2660 + suit, 16))
  }

}

module.exports = {
  Card: Card,
  Suits: suits,
  Values: values,
}
