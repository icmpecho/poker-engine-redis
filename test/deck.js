const Deck = require('../lib/deck')
const Card = require('../lib/card')


describe('Deck', function () {

  beforeEach(function* () {
    yield client.flushdbAsync()
  })

  describe('#load', function () {

    describe('new key', function () {
      let deck
      beforeEach(function* () {
        deck = new Deck(client, 'my-key')
        yield deck.load()
      })

      it('create redis record of cards with the key', function* () {
        const redisResult = yield client.getAsync('my-key:cards')
        assert.notEqual(redisResult, null)
      })

      it('initials 52 cards', function () {
        assert.lengthOf(deck.cards, 52)
      })
    })

    describe('existing key', function () {
      let deck, existingDeck
      beforeEach(function* () {
        existingDeck = new Deck(client, 'my-key')
        yield existingDeck.load()
        yield existingDeck.draw()
        deck = new Deck(client, 'my-key')
        yield deck.load()
      })

      it('returns existing deck', function* () {
        assert.lengthOf(deck.cards, 51)
      })

      it('reload cards from serialized data', function* () {
        deck.cards.forEach((card) => {
          assert.instanceOf(card, Card)
        })
      })
    })

  })

  describe('#draw', function () {
    let deck, card, topCard
    beforeEach(function* () {
      deck = new Deck(client, 'my-key')
      yield deck.load()
      topCard = deck.cards[deck.cards.length - 1]
      card = yield deck.draw()
    })

    it('returns top card', function* () {
      assert.deepEqual(card, topCard)
    })

    it('reduce remove top card from the deck', function* () {
      assert.lengthOf(deck.cards, 51)
    })

    it('save changes to redis', function* () {
      const newDeck = new Deck(client, 'my-key')
      yield newDeck.load()
      assert.lengthOf(newDeck.cards, 51)
    })
  })

  describe('#shuffle', function () {
    let deck, unshuffledDeck
    beforeEach(function* () {
      deck = new Deck(client, 'my-key')
      yield deck.load()
      unshuffledDeck = new Deck(client, 'another-key')
      yield unshuffledDeck.load()
      assert.deepEqual(deck.cards, unshuffledDeck.cards)
      yield deck.shuffle()
    })

    it('change cards order', function* () {
      assert.notDeepEqual(deck.cards, unshuffledDeck.cards)
    })

    it('save changes to redis', function* () {
      const newDeck = new Deck(client, 'my-key')
      yield newDeck.load()
      assert.deepEqual(newDeck.cards, deck.cards)
    })
  })

})
