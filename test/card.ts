import { assert } from 'chai'
import { Card } from '../src/card'

describe('Card', function () {

  describe('#toString', function () {

    it('returns string representation of the card', function () {
      const card = new Card('AS')
      assert.equal(card.toString(), 'A♠')
    })
  })

  describe('#toJSON', function () {

    it('returns basic string representation of the card', function () {
      const card = new Card('AS')
      assert.equal(card.toJSON(), 'AS')
    })
  })

  describe('#value', function () {
    it('returns same value as the number on card', function () {
      const card = new Card('2S')
      assert.equal(card.value, 2)
    })

    it('returns 11 for J', function () {
      const card = new Card('JS')
      assert.equal(card.value, 11)
    })

    it('returns 12 for Q', function () {
      const card = new Card('QS')
      assert.equal(card.value, 12)
    })

    it('returns 13 for K', function () {
      const card = new Card('KS')
      assert.equal(card.value, 13)
    })

    it('returns 14 for A', function () {
      const card = new Card('AS')
      assert.equal(card.value, 14)
    })
  })

})