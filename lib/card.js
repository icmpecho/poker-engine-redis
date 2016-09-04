class Card {

  constructor(suit, value) {
    this.suit = suit
    this.value = value
  }

  toString() {
    return this.value + this._unicodeSuit(this.suit)
  }

  toJSON() {
    return this.value + this._charSuit(this.suit)
  }

  _charSuit(suit) {
    switch(suit) {
      case Card.Suits.spade:
        return 'S'
      case Card.Suits.heart:
        return 'H'
      case Card.Suits.diamond:
        return 'D'
      case Card.Suits.club:
        return 'C'
    }
  }

  _unicodeSuit(suit) {
    return String.fromCharCode(parseInt(2660 + suit, 16))
  }

}

Card.Suits = {
  spade: 0,
  heart: 1,
  diamond: 2,
  club: 3,
}

Card.Values = [
  '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A',
]

module.exports = Card
