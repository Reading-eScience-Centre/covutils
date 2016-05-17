import assert from 'assert'

import CovUtils from '../lib/main.js'

describe("classic mode", () => {
  it("should expose modules", () => {
    assert(CovUtils.array)
    assert(CovUtils.constants)
    assert(CovUtils.constants.COVERAGE)
  })
})