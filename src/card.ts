import * as _ from 'lodash';

class Card {

  static Suits = {
    spade: 'S',
    heart: 'H',
    diamond: 'D',
    club: 'C',
  }

  static Values = [
    '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A',
  ]

  private suit: string
  private _value: string

  constructor(code: string) {
    this.suit = code[1]
    this._value = code[0]
  }

  get value(): number {
    return _.indexOf(Card.Values, this._value) + 2
  }

  toString(): string {
    return this._value + this._unicodeSuit(this.suit)
  }

  toJSON(): string {
    return this._value + this.suit
  }

  _unicodeSuit(suit: string): string {
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

  static get all() {
    let cards: Card[] = []
    _.forEach(Card.Suits, (suit) => {
      _.forEach(Card.Values, (value) => {
        cards.push(new Card(value + suit))
      })
    })
    return cards
  }

}

export { Card }