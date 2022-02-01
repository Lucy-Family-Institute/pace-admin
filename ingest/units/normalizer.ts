import _ from 'lodash'

export default class Normalizer {

  /**
  * When the given parameter is a string, return a new string with spaces removed.
  *
  * @param value A string (or any value)
  * @returns A new string with spaces removed (or the given non-String value)
  */
  public static removeSpaces (value) {
    if (_.isString(value)) {
      return _.clone(value).replace(/\s/g, '')
    } else {
      return value
    }
  }

  public static normalizeTitle(value) {
    if (_.isString(value)) {
      return _.clone(value)
        .replace(/^the /i, '')
        .replace(' and ', '')
    } else {
      return value
    }
  }

  public static stringToBoolean(value: string): boolean{
    let returnVal
    try {
      const num = Number.parseInt(value)
      if (num === 1) {
        return true
      } else if (num === 0) {
        return false
      } else {
        throw(`Unknown boolean value encountered, unable to convert value: ${value}.  The value should be formatted as '1', '0', 'true', or 'false'`)
      }
    } catch (error) {
      // try string values of 'false' and 'true' instead
      if (value && value.toLowerCase() === 'true') {
        return true
      } else if (value && value.toLowerCase() === 'false') {
        return false
      } else {
        throw(`Unknown boolean value encountered, unable to convert value: ${value}.  The value should be formatted as '1', '0', 'true', or 'false'`)
      }
    }
  }

  /**
  * Returns a new string with diacritics and "special characters"
  * removed.  If the given `value` is not a string, it returns that value.
  *
  * @remarks See ./tests/normalizer.test.ts for examples
  *
  * @param value A string (or any value)
  * @param options The valid `options` are:
  *                 * removeSpaces: when true remove all spaces
  *                 * skipLower: when true skip lower case conversion
  *                 * normalizeTitle: when true remove " and " and prefix of "the "
  * @returns A new string or the given value
  */
  public static normalizeString(value, options = {}) {
    let skipLower = _.get(options, "skipLower", false)
    let rmSpaces = _.get(options, "removeSpaces", false)
    let titleNormalization = _.get(options, "normalizeTitle", false)
    if (_.isString(value)) {
      let newValue = _.clone(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[\u2019]/g, '\u0027') // the u0027 also normalizes the curly apostrophe to the straight one
        .replace(/[&\/\\#,+()$~%.'":*?<>{}!-]/g,'') // remove periods and other remaining special characters

      if (!skipLower) {
        newValue = _.lowerCase(newValue)
      }

      if (titleNormalization) {
        newValue = Normalizer.normalizeTitle(newValue)
      }

      const returningValue = newValue
      if (rmSpaces) {
        return Normalizer.removeSpaces(returningValue)
      } else {
        return returningValue
      }
    } else {
      return value
    }
  }



  /**
  * @param object An object with properties, assumed to have already
  *               have each of the given `properties`.
  *
  * @param properties An array of named properties to on the given
  *                   `object` that this method will normalize.
  *
  * @param options These are passed to the normalizeString function; See
  *                that method's definition for valid options.
  *
  * @returns A clone of the given `object` with the named `properties`
  *          normalized via the `normalizeString()` function.
  */
  public static normalizeObjectProperties (object: any, properties: Array<string>, options = {}) {
    const newObject = _.clone(object)
    _.each (properties, (property) => {
      newObject[property] = Normalizer.normalizeString(newObject[property], options)
    })
    return newObject
  }

  public static escapeForRegEx(unescaped: string) {
    return unescaped.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
  }
}
