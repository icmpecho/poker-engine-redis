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

      it('has empty shared cards', function () {
        assert.lengthOf(game.sharedCards.cards, 0)
      })

      it('has null as starting position', function () {
        assert.equal(game.buttonPosition, null)
      })
      
      it('has null as current position', function () {
        assert.equal(game.currentPosition, null)
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
          const card = oldGame.deck.draw()
          oldGame.sharedCards.add(card)
          oldGame.buttonPosition = 1
          oldGame.currentPosition = 0
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
        const player = game.getPlayer('aaa')
        assert.equal(player.key, 'existing-key:players:aaa')
        assert.equal(player.currentBet, 10)
        assert.equal(player.credits, 10)
      })

      it('sort player by position', function () {
        assert.equal(game.players[0].position, 0)
        assert.equal(game.players[1].position, 1)
      })

      it('load existing shared cards', function () {
        assert.lengthOf(game.sharedCards.cards, 1)
      })

      it('load existing startingPosition', function () {
        assert.equal(game.buttonPosition, 1)
      })

      it('load existing currentPosition', function () {
        assert.equal(game.currentPosition, 0)
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
        const card = oldGame.deck.draw()
        oldGame.sharedCards.add(card)
        await oldGame.addPlayer('aaa')
        await oldGame.addPlayer('bbb')
        oldGame.players[0].bet(10)
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
      assert.lengthOf(game.sharedCards.cards, 0)
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

  describe('#getPlayer', function () {
    let game: Game
    beforeEach(function () {
      return async function () {
        game = new Game(client, 'my-key')
        await game.load()
        game.init()
        await game.addPlayer('aaa')
        await game.addPlayer('bbb')
      }()
    })

    it('return player with the given id', function () {
      const player = game.getPlayer('aaa')
      assert.equal(player.key, 'my-key:players:aaa')
    })

    it('return undefined if no player with the given key', function () {
      const player = game.getPlayer('ccc')
      assert.isUndefined(player)
    })
  })

  describe('#start', function () {
    let game: Game
    beforeEach(function () {
      return async function () {
        game = new Game(client, 'my-key')
        await game.load()
      }()
    })

    it('throw exception if game is not ready to start', function() {
      assert.throw(() => game.start())
    })

    describe('initialized', function () {
      beforeEach(function () {
        return async function () {
          game.init()
          await game.addPlayer('aaa')
          await game.addPlayer('bbb')
          await game.addPlayer('ccc')
        }()
      })

      it('change game state to ongoing', function () {
        game.start()
        assert.equal(game.state, 'ongoing')
      })

      it('deal 2 cards to all players', function () {
        game.start()
        assert.lengthOf(game.players[0].hand.cards, 2)
        assert.lengthOf(game.players[1].hand.cards, 2)
        assert.lengthOf(game.players[2].hand.cards, 2)
        assert.lengthOf(game.deck.cards, 46)
      })

      it('place button on first player', function () {
        game.start()
        assert.equal(game.buttonPosition, 0)
      })

      it('place button to next player if there is not the first game', function () {
        game.buttonPosition = 0
        game.start()
        assert.equal(game.buttonPosition, 1)
      })

      it('skip player that have no credits while placing button', function () {
        game.buttonPosition = 1
        game.players[2].credits = 0
        game.start()
        assert.equal(game.buttonPosition, 0)
      })

      it('throw exception if game is already started', function () {
        game.start()
        assert.throw(() => game.start())
      })
    })
  })
})