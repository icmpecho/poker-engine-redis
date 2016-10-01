import { assert, client } from './helper'
import { Pile } from '../src/pile'
import { Card } from '../src/card'

describe('Deck', function () {

  beforeEach(function () {
    return client.flushdbAsync()
  })

  describe('#load', function () {

    describe('new key', function () {
      let deck: Pile
      beforeEach(function () {
        deck = new Pile(client, 'my-key', Card.all)
        return deck.load()
      })

      it('initials 52 cards', function () {
        assert.lengthOf(deck.cards, 52)
      })
    })
  })

})
