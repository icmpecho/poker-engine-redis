const {Card} = require('../src/card')

describe('Card', function () {

  describe('#toString', function () {

    it('returns string representation of the card', function () {
      const card = new Card('AS')
      assert.equal(card.toString(), 'A♠')
    })
  })

  describe('#toJSON', function () {

    it('returns basic string representation of the card', function () {
      const card = new Card('AS')
      assert.equal(card.toJSON(), 'AS')
    })
  })

})