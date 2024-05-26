import { randomInt } from "../src/utils"

export default class Global {
    static _seed = 0n
    static seed(location: string) {
        Global._seed = BigInt(randomInt(1, Number.MAX_SAFE_INTEGER))
        // eslint-disable-next-line no-console
        console.log('Seed', Global._seed, location)
        return Global._seed
    }
}