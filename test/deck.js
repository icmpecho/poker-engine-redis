const Deck = require('../lib/deck')

describe('Deck', function () {

  describe('constructor', function () {

    it('initials 52 cards', function () {
      const deck = new Deck()
      assert.lengthOf(deck.cards, 52)
    })

  })

})