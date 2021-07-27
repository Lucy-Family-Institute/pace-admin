import _ from 'lodash'
import NormedAuthor from './normedAuthor'

export default class BibTex {
  title: string
  journal: string
  author: string
  year: string
  month?: string
  day?: string
  publisher?: string
  url?: string
  issn?: string
  doi?: string
  abstract?: string
  number?: string
  volume?: string
  pages?: string
  eprint?: string

  public static toString(bibTex: BibTex): string {
    let bibStr = `@article{${bibTex.doi},`
    _.each(_.keys(bibTex), (key, index) => {
      if (index > 0) {
        bibStr = `${bibStr}, `
      }
      bibStr = `${bibStr}${key} = {${bibTex[key]}}`
    })
    bibStr = `${bibStr} }`
    return bibStr
  }

  public static getBibTexAuthors(normedAuthors: NormedAuthor[]): string {
    let authorStr = ''
    _.each (normedAuthors, (normedAuthor, index) => {
      if (index !== 0){
        authorStr = `${authorStr} and `
      }
      authorStr = `${authorStr}${normedAuthor.familyName}, ${normedAuthor.givenName}`
    })
    return authorStr
  }
}