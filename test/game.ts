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
})