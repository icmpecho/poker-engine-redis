const Pile = require('../lib/pile')
const Card = require('../lib/card')


describe('Deck', function () {

  beforeEach(function* () {
    yield client.flushdbAsync()
  })

  describe('#load', function () {

    describe('new key', function () {
      let deck
      beforeEach(function* () {
        deck = new Pile(client, 'my-key', Card.all)
        yield deck.load()
      })

      it('initials 52 cards', function () {
        assert.lengthOf(deck.cards, 52)
      })
    })
  })

})
