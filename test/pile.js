const Pile = require('../src/pile')
const {Card} = require('../src/card')


describe('Pile', function () {

  beforeEach(function* () {
    yield client.flushdbAsync()
  })

  describe('#load', function () {

    describe('new key', function () {
      let pile
      beforeEach(function* () {
        pile = new Pile(client, 'my-key')
        yield pile.load()
      })

      it('create redis record of cards with the key', function* () {
        const redisResult = yield client.getAsync('my-key:cards')
        assert.notEqual(redisResult, null)
      })

      it('initials 0 cards', function () {
        assert.lengthOf(pile.cards, 0)
      })
    })

    describe('existing key', function () {
      let pile, existingPile
      beforeEach(function* () {
        existingPile = new Pile(client, 'my-key')
        yield existingPile.load()
        existingPile.cards.push(new Card('2C'))
        yield existingPile.save()
        pile = new Pile(client, 'my-key')
        yield pile.load()
      })

      it('returns existing pile', function* () {
        assert.lengthOf(pile.cards, 1)
      })

      it('reload cards from serialized data', function* () {
        pile.cards.forEach((card) => {
          assert.instanceOf(card, Card)
        })
      })
    })

  })

  describe('#add', function () {
    let pile
    beforeEach(function* () {
      pile = new Pile(client, 'my-key')
      yield pile.load()
      yield pile.add(new Card('2C'))
    })

    it('add card to the pile', function* () {
      assert.deepEqual(pile.cards[0], new Card('2C'))
    })

    it('save changes to redis', function* () {
      const newPile = new Pile(client, 'my-key')
      yield newPile.load()
      assert.lengthOf(newPile.cards, 1)
    })
  })

  describe('#draw', function () {
    let pile, card
    beforeEach(function* () {
      pile = new Pile(client, 'my-key')
      yield pile.load()
      pile.cards.push(new Card('2C'))
      pile.cards.push(new Card('3C'))
      pile.cards.push(new Card('4C'))
      yield pile.save()
      card = yield pile.draw()
    })

    it('returns top card', function* () {
      assert.deepEqual(card, new Card('4C'))
    })

    it('reduce remove top card from the pile', function* () {
      assert.lengthOf(pile.cards, 2)
    })

    it('save changes to redis', function* () {
      const newPile = new Pile(client, 'my-key')
      yield newPile.load()
      assert.lengthOf(newPile.cards, 2)
    })
  })

  describe('#shuffle', function () {
    let pile, cards = [new Card('2C'), new Card('3C'), new Card('4C')]
    beforeEach(function* () {
      pile = new Pile(client, 'my-key')
      yield pile.load()
      cards.forEach(c => pile.cards.push(c))
      yield pile.save()
      assert.deepEqual(pile.cards, cards)
      yield pile.shuffle()
    })

    it('change cards order', function* () {
      assert.notDeepEqual(pile.cards, cards)
    })

    it('save changes to redis', function* () {
      const newPile = new Pile(client, 'my-key')
      yield newPile.load()
      assert.deepEqual(newPile.cards, pile.cards)
    })
  })

})
