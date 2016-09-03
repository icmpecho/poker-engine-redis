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

  describe('#draw', function () {

    it('returns top card', function () {
      const deck = new Deck()
      const topCard = deck.cards[deck.count - 1]
      const result = deck.draw()
      assert.deepEqual(result, topCard)
    })

    it('removes top card', function () {
      const deck = new Deck()
      const originalCount = deck.count
      deck.draw()
      assert.equal(deck.count, originalCount - 1)
    })

  })

})