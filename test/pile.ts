import { assert, client } from './helper'
import { Pile } from '../src/pile'
import { Card } from '../src/card'

describe('Pile', function () {

  beforeEach(function () {
    return client.flushdbAsync()
  })

  describe('#load', function () {

    describe('new key', function () {
      let pile: Pile
      beforeEach(function() {
        return async function () {
          pile = new Pile(client, 'my-key')
          await pile.load()
          await pile.save()
        }()
      })

      it('create redis record of cards with the key', function () {
        const redisResult = client.getAsync('my-key:cards')
        return assert.eventually.notEqual(redisResult, null)
      })

      it('initials 0 cards', function () {
        assert.lengthOf(pile.cards, 0)
      })
    })

    describe('existing key', function () {
      let pile: Pile, existingPile: Pile
      beforeEach(function() {
        return async function() {
          existingPile = new Pile(client, 'my-key')
          await existingPile.load()
          existingPile.cards.push(new Card('2C'))
          await existingPile.save()
          pile = new Pile(client, 'my-key')
          await pile.load()
        }()
      })

      it('returns existing pile', function () {
        assert.lengthOf(pile.cards, 1)
      })

      it('reload cards from serialized data', function () {
        pile.cards.forEach((card) => {
          assert.instanceOf(card, Card)
        })
      })
    })
  })

  describe('#add', function () {
    let pile: Pile
    beforeEach(function () {
      return async function () {
        pile = new Pile(client, 'my-key')
        await pile.load()
        pile.add(new Card('2C'))
      }()
    })

    it('add card to the pile', function () {
      assert.deepEqual(pile.cards[0], new Card('2C'))
    })
  })

  describe('#draw', function () {
    let pile: Pile, card: Card
    beforeEach(function () {
      return async function () {
        pile = new Pile(client, 'my-key')
        await pile.load()
        pile.cards.push(new Card('2C'))
        pile.cards.push(new Card('3C'))
        pile.cards.push(new Card('4C'))
        await pile.save()
        card = pile.draw()
      }()
    })

    it('returns top card', function () {
      assert.deepEqual(card, new Card('4C'))
    })

    it('reduce remove top card from the pile', function () {
      assert.lengthOf(pile.cards, 2)
    })
  })

  describe('#shuffle', function () {
    let pile: Pile, cards: Card[]
    beforeEach(function () {
      return async function () {
        cards = Card.all
        pile = new Pile(client, 'my-key', cards)
        await pile.load()
        assert.deepEqual(pile.cards, cards)
        pile.shuffle()
      }()
    })

    it('change cards order', function () {
      assert.notDeepEqual(pile.cards, cards)
    })
  })

  describe('#restoreDefault', function () {
    it('restore cards to default value', function () {
      return async function () {
        const cards = Card.all
        const pile = new Pile(client, 'my-key', Card.all)
        await pile.load()
        pile.shuffle()
        assert.notDeepEqual(pile.cards, cards)
        pile.restoreDefault()
        assert.deepEqual(pile.cards, cards)
      }()
    })
  })
})
