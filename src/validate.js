import { COVERAGE, DOMAIN } from './constants.js'

export function isCoverage (obj) {
  return obj.type === COVERAGE
}

export function checkCoverage (obj) {
  if (!isCoverage(obj)) {
    throw new Error('must be a Coverage')
  }
}

export function isDomain (obj) {
  return obj.type === DOMAIN
}

export function checkDomain (obj) {
  if (!isDomain(obj)) {
    throw new Error('must be a Domain')
  }
}
