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
    })

    describe('existing key', function () {
      let game: Game
      beforeEach(function () {
        return async function () {
          const oldGame = new Game(client, 'existing-key')
          await oldGame.load()
          await oldGame.deck.shuffle()
          await oldGame.deck.draw()
          await oldGame.save()
          game = new Game(client, 'existing-key')
          await game.load()
        }()
      })

      it('load existing game', function () {
        assert.lengthOf(game.deck.cards, 51)
      })
    })
  }) 
})