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
      
      it('initialize state to normal', function () {
        assert.equal(player.state, 'waiting')
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
          oldPlayer.fold()
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

      it('load existing player state', function () {
        assert.equal(player.state, 'fold')
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

    it('change state to played', function () {
      player.bet(5)
      assert.equal(player.state, 'played')
    })

    it('set allin if not enough credits available', function () {
      player.bet(21)
      assert.equal(player.currentBet, 20)
      assert.equal(player.state, 'allin')
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

    it('return false if player has folded', function () {
      player.fold()
      assert.isFalse(player.active)
    })

    it('return true otherwise', function () {
      assert.isTrue(player.active)
    })
  })

  describe('#newRound', function () {
    let player: Player
    beforeEach(function () {
      return async function () {
        player = new Player(client, 'my-key')
        await player.load()
        player.bet(5)
        player.fold()
        player.hand.add(new Card('AS'))
      }()
    })

    it('remove currentBet', function () {
      player.newRound()
      assert.equal(player.currentBet, 0)
    })

    it('reset state to normal', function () {
      player.newRound()
      assert.equal(player.state, 'waiting')
    })

    it('set state to fold if no credits', function () {
      player.credits = 0
      player.newRound()
      assert.equal(player.state, 'fold')
    })

    it('clear player hand', function () {
      player.newRound()
      assert.lengthOf(player.hand.cards, 0)
    })
  })
})