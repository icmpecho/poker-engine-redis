import * as _ from 'lodash'
import { Card } from './card'

function kCombinations(cards: Card[], k: number): Card[][] {
  if (k > cards.length || k <= 0) {
    return []
  }

  if (k == cards.length) {
    return [cards]
  }

  if (k == 1) {
    return cards.map(c => [c])
  }

  const combs: Card[][] = []
  for (let i = 0; i < cards.length - k + 1; i++) {
    const head = cards.slice(i, i + 1)
    const tailCombs = kCombinations(cards.slice(i + 1), k-1)
    tailCombs.forEach(tail => {
      combs.push(_.concat(head, tail))
    })
  }
  return combs
}

function handCombinations(cards: Card[]): Card[][] {
  return kCombinations(cards, 5)
}

export { handCombinations }
