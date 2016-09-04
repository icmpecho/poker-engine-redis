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

      it('initials 52 cards', function () {
        assert.lengthOf(deck.cards, 52)
      })
    })
  })

})
