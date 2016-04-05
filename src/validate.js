import {COVERAGE, DOMAIN} from './constants.js'

export function checkCoverage (obj) {
  if (obj.type !== COVERAGE) {
    throw new Error('must be a Coverage')
  }
}

export function checkDomain (obj) {
  if (obj.type !== DOMAIN) {
    throw new Error('must be a Domain')
  }
}