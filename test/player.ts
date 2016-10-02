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

      it('initialize currentBet to zero', function () {
        assert.equal(player.currentBet, 0)
      })
    })

    describe('existing key', function () {
      let player: Player
      beforeEach(function() {
        return async function () {
          const oldPlayer = new Player(client, 'existing-key', 20, 2)
          await oldPlayer.load()
          oldPlayer.hand.add(new Card('AS'))
          oldPlayer.credits = 10
          oldPlayer.currentBet = 2
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

      it('load existing currentBet', function () {
        assert.equal(player.currentBet, 2)
      })

      it('load existing player position', function () {
        assert.equal(player.position, 2)
      })
    })
  })

  describe('#bet', function () {
    let player: Player
    beforeEach(function () {
      return async function () {
        player = new Player(client, 'my-key')
        await player.load()
      }()
    })

    it('remove credits', function () {
      player.bet(5)
      assert.equal(player.credits, 15)
    })

    it('add the input amount to currentBet', function () {
      player.bet(5)
      assert.equal(player.currentBet, 5)
      player.bet(2)
      assert.equal(player.currentBet, 7)
    })

    it('throw error if not enough credits available', function () {
      assert.throw(() => player.bet(21))
    })
  })

  describe('#active', function () {
    let player: Player
    beforeEach(function () {
      return async function () {
        player = new Player(client, 'my-key')
        await player.load()
      }()
    })

    it('return false if player has no credits', function () {
      player.credits = 0
      assert.isFalse(player.active)
    })

    it('return true otherwise', function () {
      assert.isTrue(player.active)
    })
  })
})