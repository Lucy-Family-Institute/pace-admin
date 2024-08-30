import MeiliSearch from 'meilisearch'

import dotenv from 'dotenv'

dotenv.config({
  path: '../.env'
})

const meiliKey = process.env.MEILI_KEY
const meiliUrl = `${process.env.APP_BASE_URL}/api/search/`

const searchClient = new MeiliSearch({
  host: `${process.env.MEILI_HOST}`, // todo fix this sometime
  apiKey: meiliKey
})


async function main() {
    console.log(await searchClient.getKeys())
}

main()