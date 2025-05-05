import {randomInt} from 'bloom-filters/utils'

export function getNewSeed() {
  return BigInt(randomInt(1, Number.MAX_SAFE_INTEGER))
}
