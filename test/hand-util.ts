import { assert } from './helper'
import { Card } from '../src/card'
import { handCombinations } from '../src/hand-util'

describe.only('Hand Util', function () {

  describe('#handCombinations', function () {
    const cards = Card.all.slice(0, 7)
    const combs = handCombinations(cards)

    it('returns 21 combinations for 7 cards hand', function () {
      assert.lengthOf(combs, 21)
    })

    it('returns 5 cards in each combination', function () {
      combs.forEach(c => {
        assert.lengthOf(c, 5)
      })
    })
  })
})