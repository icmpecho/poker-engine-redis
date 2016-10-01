import { assert, client } from './helper'
import { Player } from '../src/player'
import { Card } from '../src/card'

describe('Player', function () {

  beforeEach(function () {
    return client.flushdbAsync()
  })

  describe('#load', function () {

    describe('new key', function () {
      let player: Player
      beforeEach(function() {
        player = new Player(client, 'my-key')
        return player.load()
      })

      it('initialize an empty hand', function () {
        assert.deepEqual(player.hand.cards, [])
      })

      it('intialize credits to default value', function () {
        assert.equal(player.credits, 20)
      })
    })

    describe('existing key', function () {
      let player: Player
      beforeEach(function() {
        return async function () {
          const oldPlayer = new Player(client, 'existing-key')
          await oldPlayer.load()
          oldPlayer.hand.add(new Card('AS'))
          oldPlayer.credits = 10
          await oldPlayer.save()
          player = new Player(client, 'existing-key')
          await player.load()
        }()
      })

      it('load existing player hand', function () {
        assert.lengthOf(player.hand.cards, 1)
      })

      it('load existing player credits', function () {
        assert.equal(player.credits, 10)
      })
    })
  })
})