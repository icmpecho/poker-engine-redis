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

module.exports = {
  Card: Card,
  Suits: suits,
}
