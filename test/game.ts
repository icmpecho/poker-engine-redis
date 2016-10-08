import * as _ from 'lodash'
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
          game = new Game(client, 'my-key', 30)
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

      it('set defaultCredits', function () {
        assert.equal(game.defaultCredits, 30)
      })

      it('propergate defaultCredits to players', function () {
        return async function () {
          game.init()
          await game.addPlayer('aaa')
          assert.equal(game.getPlayer('aaa').credits, 30)
        }()
      })

      it('initialize pots', function () {
        assert.deepEqual(game.pots, [{ value: 0 }])
      })
    })

    describe('existing key', function () {
      let game: Game
      beforeEach(function () {
        return async function () {
          const oldGame = new Game(client, 'existing-key', 30)
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
          oldGame.pots = [{ value: 10 }, { value: 4, excludedPlayerIds: ['aaa'] }]
          await oldGame.save()
          game = new Game(client, 'existing-key')
          await game.load()
        }()
      })

      it('load existing deck', function () {
        assert.lengthOf(game.deck.cards, 51)
      })

      it('load existing game state', function () {
        assert.equal(game.state, 'preparing')
      })

      it('load defaultCredits', function () {
        assert.equal(game.defaultCredits, 30)
      })

      it('load existing players', function () {
        assert.lengthOf(game.players, 2)
        const player = game.getPlayer('aaa')
        assert.equal(player.key, 'existing-key:players:aaa')
        assert.equal(player.currentBet, 10)
        assert.equal(player.credits, 20)
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

      it('load existing pots', function () {
        assert.deepEqual(
          game.pots, [{ value: 10 }, { value: 4, excludedPlayerIds: ['aaa'] }]
        )
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
      assert.equal(game.state, 'preparing')
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
          await game.addPlayer('ddd')
          const player = game.getPlayer('ddd')
          player.credits = 0
        }()
      })

      it('change game state to ongoing', function () {
        game.start()
        assert.equal(game.state, 'preflop')
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

      it('deduct small blind from active player next to button', function () {
        game.start()
        const player = game.getPlayer('bbb')
        assert.equal(player.currentBet, 1)
        assert.equal(player.credits, 19)
      })

      it('deduct big blind from active player next to small blind', function () {
        game.start()
        const player = game.getPlayer('ccc')
        assert.equal(player.currentBet, 2)
        assert.equal(player.credits, 18)
      })

      it('set current position to active player next to big blind', function () {
        game.start()
        assert.equal(game.playerId(game.currentPlayer), 'aaa')
      })
    })
  })

  describe('#fold, #check, #call, #raise', function () {
    let game: Game
    beforeEach(function () {
      return async function() {
        game = new Game(client, 'my-key')
        await game.load()
        game.init()
        await game.addPlayer('aaa')
        await game.addPlayer('bbb')
        await game.addPlayer('ccc')
        await game.addPlayer('ddd')
      }()
    })

    it('throw error if game is not in progress', function () {
      assert.throw(() => game.fold('ddd'))
      assert.throw(() => game.check('ddd'))
      assert.throw(() => game.call('ddd'))
      assert.throw(() => game.raise('ddd', 10))
      assert.throw(() => game.allIn('ddd'))
    })

    describe('started', function () {
      beforeEach(function () {
        game.start()
      })

      it('throw error if player is not current player', function () {
        assert.equal(game.playerId(game.currentPlayer), 'ddd')
        assert.throw(() => game.fold('aaa'))
        assert.throw(() => game.check('aaa'))
        assert.throw(() => game.call('aaa'))
        assert.throw(() => game.raise('aaa', 10))
        assert.throw(() => game.allIn('aaa'))
      })

      describe('#fold', function () {
        it('mark current player as fold', function () {
          game.fold('ddd')
          assert.equal(game.getPlayer('ddd').state, 'fold')
        })

        it('change current position to next active player', function () {
          game.fold('ddd')
          assert.equal(game.playerId(game.currentPlayer), 'aaa')
        })
      })

      describe('#check', function () {
        it('throw error if current player bet does not match the highest', function () {
          game.getPlayer('ccc').bet(5)
          assert.throw(() => game.check('ddd'))
        })

        it('mark current player as played', function () {
          game.getPlayer('ddd').currentBet = 2
          game.check('ddd')
          assert.equal(game.getPlayer('ddd').state, 'played')
        })

        it('does not change currentBet of the player', function () {
          game.getPlayer('ddd').currentBet = 2
          game.check('ddd')
          assert.equal(game.getPlayer('ddd').currentBet, 2)
        })

        it('change current position to next active player', function () {
          game.getPlayer('ddd').currentBet = 2
          game.check('ddd')
          assert.equal(game.playerId(game.currentPlayer), 'aaa')
        })
      })

      describe('#call', function () {
        it('throw error if current player already has the highest bet', function () {
          game.getPlayer('ddd').currentBet = 5
          assert.throw(() => game.call('ddd'))
        })

        it('set current player bet to the highest bet', function () {
          game.getPlayer('aaa').bet(5)
          game.call('ddd')
          assert.equal(game.getPlayer('ddd').currentBet, 5)
        })

        it('mark current player as played', function () {
          game.call('ddd')
          assert.equal(game.getPlayer('ddd').state, 'played')
        })

        it('change current position to next active player', function () {
          game.call('ddd')
          assert.equal(game.playerId(game.currentPlayer), 'aaa')
        })
      })

      describe('#raise', function () {
        it('throw error if target is le highest bet', function () {
          game.getPlayer('aaa').bet(5)
          assert.throw(() => game.raise('ddd', 5))
        })

        it('set current player bet to the target', function () {
          game.raise('ddd', 10)
          assert.equal(game.getPlayer('ddd').currentBet, 10)
        })

        it('mark current player as played', function () {
          game.raise('ddd', 10)
          assert.equal(game.getPlayer('ddd').state, 'played')
        })

        it('change current position to next active player', function () {
          game.raise('ddd', 10)
          assert.equal(game.playerId(game.currentPlayer), 'aaa')
        })
      })

      describe('#allIn', function () {
        it('put all current player credits to currentBet', function () {
          game.allIn('ddd')
          assert.equal(game.getPlayer('ddd').currentBet, 20)
          assert.equal(game.getPlayer('ddd').credits, 0)
        })

        it('mark current player as allin', function () {
          game.allIn('ddd')
          assert.equal(game.getPlayer('ddd').state, 'allin')
        })

        it('change current position to next active player', function () {
          game.allIn('ddd')
          assert.equal(game.playerId(game.currentPlayer), 'aaa')
        })
      })

      describe('#collectBets', function () {
        it('collect bets from all players into pot', function () {
          _.times(3, () => game.call(game.playerId(game.currentPlayer)))
          assert.equal(game.currentPot.value, 8)
          game.players.forEach(p => {
            assert.equal(p.currentBet, 0)
          })
        })

        describe('all-in situation', function () {
          beforeEach(function () {
            const playerA = game.getPlayer('aaa')
            const playerD = game.getPlayer('ddd')
            playerA.credits = 10
            playerD.credits = 15
            game.allIn('ddd')
            game.allIn('aaa')
            game.raise('bbb', 16)
            game.call('ccc')
          })

          it('split pots into 3 pots', function () {
            assert.lengthOf(game.pots, 3)
          })

          it('contains credits up to playerA bet in first pot', function () {
            assert.equal(game.pots[0].value, 40)
          })

          it('does not exclude anyone from first pot', function () {
            assert.isUndefined(game.pots[0].excludedPlayerIds)
          })

          it('contains credits up to playerD bet in second pot', function () {
            assert.equal(game.pots[1].value, 15)
          })

          it('exclude playerA from the second pot', function () {
            assert.deepEqual(game.pots[1].excludedPlayerIds, ['aaa'])
          })

          it('contains credits up to highest bet in third pot', function () {
            assert.equal(game.pots[2].value, 2)
          })
        })
      })

      describe('#newBettingRound', function () {
        beforeEach(function () {
          const playerA = game.getPlayer('aaa')
          const playerD = game.getPlayer('ddd')
          playerA.credits = 10
          playerD.credits = 15
          game.allIn('ddd')
          game.allIn('aaa')
          game.raise('bbb', 16)
          game.call('ccc')
        })

        it('Change game state to the next state', function () {
          assert.equal(game.state, 'theFlop')
        })

        it('Change all active players state back to waiting', function () {
          game.activePlayers.forEach(p => {
            assert.equal(p.state, 'waiting')
          })
        })

        it('Does not touch all-in players', function () {
          assert.lengthOf(game.allInPlayers, 2)
        })

        it('deal 3 cards to sharedCards in theFlop', function () {
          assert.lengthOf(game.sharedCards.cards, 3)
        })

        it('set currentPlayer to the one next to button', function () {
          assert.equal(game.playerId(game.currentPlayer), 'bbb')
        })
      })
    })
  })

  describe('#isDoneBetting', function () {
    let game: Game
    beforeEach(function () {
      return async function () {
        game = new Game(client, 'my-key')
        await game.load()
        game.init()
        await game.addPlayer('aaa')
        await game.addPlayer('bbb')
        await game.addPlayer('ccc')
        await game.addPlayer('ddd')
        game.start()
      }()
    })

    it('return false if there still players in waiting state', function () {
      assert.isFalse(game.isDoneBetting)
    })

    it('return false if there is still player who has not match highest bet', function () {
      _.times(2, () => game.call(game.playerId(game.currentPlayer)))
      game.raise(game.playerId(game.currentPlayer), 5)
      assert.isFalse(game.isDoneBetting)
    })

    it('return true if the underBetPlayer is already all-in', function () {
      const playerA = game.getPlayer('aaa')
      playerA.credits = 5
      game.getPlayer('ddd').bet(10)
      playerA.bet(5)
      game.getPlayer('bbb').bet(9)
      game.getPlayer('ccc').bet(8)
      assert.equal(playerA.credits, 0)
      assert.equal(playerA.state, 'allin')
      assert.isTrue(game.isDoneBetting)
    })

    it('return true otherwise', function () {
      game.getPlayer('ddd').bet(2)
      game.getPlayer('aaa').bet(2)
      game.getPlayer('bbb').bet(1)
      assert.isTrue(game.isDoneBetting)
    })
  })
})