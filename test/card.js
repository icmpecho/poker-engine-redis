const _ = require('lodash')
const { Card, Suits } = require('../lib/card')

describe('Card', function () {

  describe('toString', function () {
    it('returns string representation of the card', function () {
      const card = new Card(Suits.spade, 'A')
      assert.equal(card.toString(), 'A-S')
    })
  })
})