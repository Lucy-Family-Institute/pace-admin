import _ from 'lodash'
import { removeSpaces, normalizeString } from '../normalizer'

const theNormalizeStringScenarios = [
  { given: "Björk", expected: "bjork" },
  { given: 123, expected: 123 },
  { given: "John-Jacob Jingleheimer‘s Schmidt!", expected: "john jacob jingleheimer s schmidt" },
  { given: "Wonder wall", options: { removeSpaces: true }, expected: "wonderwall" },
  { given: "Wonder wäll", options: { removeSpaces: false, skipLower: true }, expected: "Wonder wall" },
  { given: "The Wonder & wäll", options: { normalizeTitle: true, removeSpaces: true, skipLower: true }, expected: "Wonderwall" },
  { given: "Then Wonder & wäll", options: { normalizeTitle: true, removeSpaces: true, skipLower: true }, expected: "ThenWonderwall" },
]

test('normalizeString(): test the various scenarios', () => {
  expect.hasAssertions();
  _.each(theNormalizeStringScenarios, (scenario) => {
    let options = _.get(scenario, "options", {})
    expect(normalizeString(scenario.given, options)).toEqual(scenario.expected)
  })
})

test('normalizeString() without options passed', () => {
  expect(normalizeString("Björk")).toEqual("bjork")
})

const theRemoveSpacesScenarios = [
  { given: "Björk", expected: "Björk" },
  { given: 123, expected: 123 },
  { given: "John-Jacob Jingleheimer‘s Schmidt!", expected: "John-JacobJingleheimer‘sSchmidt!" },
  { given: "Wonder wall", expected: "Wonderwall" }
]

test('removeSpaces(): test the various scenarios', () => {
  expect.hasAssertions();
  _.each(theRemoveSpacesScenarios, (scenario) => {
    expect(removeSpaces(scenario.given)).toEqual(scenario.expected)
  })
})
