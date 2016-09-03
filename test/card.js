const _ = require('lodash')
const { Card, Suits } = require('../lib/card')

describe('Card', function () {

  describe('toString', function () {
    it('returns string representation of the card', function () {
      const card = new Card(Suits.spade, '1')
      assert.equal(card.toString(), '1-S')
    })
  })
})