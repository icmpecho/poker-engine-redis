import { assert, client } from './helper'
import { Game } from '../src/game'

describe('Game', function () {
  
  beforeEach(function () {
    return client.flushdbAsync()
  })

  describe('#load', function () {

    describe('new key', function () {
      let game: Game
      beforeEach(function () {
        return async function() {
          game = new Game(client, 'my-key')
          await game.load()
          await game.save()
        }()
      })

      it('create a new deck with the given key', function () {
        const deck = client.getAsync('my-key:deck:cards')
        return assert.eventually.isNotNull(deck)
      })

      it('initialize state to idle', function () {
        assert.equal(game.state, 'idle')
      })

      it('has no players', function () {
        assert.lengthOf(game.players, 0)
      })
    })

    describe('existing key', function () {
      let game: Game
      beforeEach(function () {
        return async function () {
          const oldGame = new Game(client, 'existing-key')
          await oldGame.load()
          oldGame.init()
          oldGame.deck.shuffle()
          oldGame.deck.draw()
          await oldGame.addPlayer('aaa')
          await oldGame.addPlayer('bbb')
          oldGame.players[0].bet(10)
          await oldGame.save()
          game = new Game(client, 'existing-key')
          await game.load()
        }()
      })

      it('load existing deck', function () {
        assert.lengthOf(game.deck.cards, 51)
      })

      it('load existing game state', function () {
        assert.equal(game.state, 'starting')
      })

      it('load existing players', function () {
        assert.lengthOf(game.players, 2)
        assert.equal(game.players[0].key, 'existing-key:players:aaa')
        assert.equal(game.players[0].currentBet, 10)
        assert.equal(game.players[0].credits, 10)
      })
    })
  })

  describe('#reset', function () {
    let game: Game
    beforeEach(function () {
      return async function () {
        const oldGame = new Game(client, 'existing-key')
        await oldGame.load()
        oldGame.init()
        oldGame.deck.shuffle()
        oldGame.deck.draw()
        await oldGame.save()
        game = new Game(client, 'existing-key')
        await game.reset()
      }()
    })

    it('remove all data related to the key from redis', function () {
      return async function () {
        const deck = await client.getAsync('existing-key:deck:cards')
        assert.isNull(deck)
        const state = await client.getAsync('existing-key:_state')
        assert.isNull(state)
      }()
    })

    it('set the game object to default state', function () {
      assert.lengthOf(game.deck.cards, 52)
      assert.equal(game.state, 'idle')
      assert.lengthOf(game.players, 0)
    })
  })

  describe('#init', function () {
    let game: Game
    beforeEach(function() {
      return async function() {
        game = new Game(client, 'my-key')
        await game.load()
      }()
    })

    it('change game state from idle to starting', function () {
      game.init()
      assert.equal(game.state, 'starting')
    })

    it('throw exception if state is not idle', function () {
      game.init()
      assert.throw(() => game.init())
    })
  })

  describe('#addPlayer', function () {
    let game: Game
    beforeEach(function () {
      return async function() {
        game = new Game(client, 'my-key')
        await game.load()
      }()
    })

    it('reject if game is not in starting state', function () {
      assert.isRejected(game.addPlayer('aaa'))
    })

    it('add player to the game', function () {
      return async function () {
        game.init()
        await game.addPlayer('aaa')
        assert.lengthOf(game.players, 1)
        assert.equal(game.players[0].key, 'my-key:players:aaa')
        assert.equal(game.players[0].credits, 20)   
      }()
    })

    it('reject if the player is already in the game', function () {
      return async function () {
        game.init()
        await game.addPlayer('aaa')
        await assert.isFulfilled(game.addPlayer('bbb'))
        await assert.isRejected(game.addPlayer('aaa'))
      }()
    })
  })
})