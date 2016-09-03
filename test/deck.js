const Deck = require('../lib/deck')

describe('Deck', function () {

  describe('#constructor', function () {

    it('initials 52 cards', function () {
      const deck = new Deck()
      assert.equal(deck.count, 52)
    })

  })

  describe('#shuffle', function () {

    it('change card order', function () {
      const deck = new Deck()
      const newDeck = new Deck()
      assert.deepEqual(deck, newDeck)
      deck.shuffle()
      assert.notDeepEqual(deck, newDeck)
    })

  })
})