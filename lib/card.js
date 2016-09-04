class Card {

  constructor(string) {
    this.suit = string[1]
    this.value = string[0]
  }

  toString() {
    return this.value + this._unicodeSuit(this.suit)
  }

  toJSON() {
    return this.value + this.suit
  }

  _unicodeSuit(suit) {
    switch(suit) {
      case Card.Suits.spade:
        return '♠'
      case Card.Suits.heart:
        return '♥'
      case Card.Suits.diamond:
        return '♦'
      case Card.Suits.club:
        return '♣'
      default:
        return ''
    }
  }
}

Card.Suits = {
  spade: 'S',
  heart: 'H',
  diamond: 'D',
  club: 'C',
}

Card.Values = [
  '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A',
]

module.exports = Card
