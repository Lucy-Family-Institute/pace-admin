import { ApolloClient, MutationOptions } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
const { DownloaderHelper } = require('node-downloader-helper');
import fetch from 'node-fetch'
import gql from 'graphql-tag'
import axios from 'axios'
import _ from 'lodash'
import pMap from 'p-map'
import sanitize from 'sanitize-filename'
import jshashes from 'jshashes'
import pdf from 'pdf-thumbnail'
import fs from 'fs'

const EMAIL = `pace@nd.edu`

async function getDois (client: any) {
  const results = await client.query({
    query: gql`
      query MyQuery {
        publications {
          doi
          id
        }
      }
    `
  })
  return results.data.publications
}

async function downloadFile ( url: string, directory: string, options: any ) {
  const dl = new DownloaderHelper(url, directory, options)
  return new Promise ( (resolve, reject) => {
    dl.on('end', () => resolve(true))
    dl.start()
  })
}

async function thumbnail ( input: string, output: string ) {
  console.log(input, output)
  return new Promise ((resolve, reject) => {
    const stream = fs.createWriteStream(output)
    stream.on('finish', () => {
      resolve(output)
    })
    pdf(
      fs.readFileSync(input)
    ).then(data => {
      data.pipe(stream)
    }).catch(err => reject(err))
  })
}

async function downloadFromUnpaywall (doi) {
  const url = `https://api.unpaywall.org/v2/${doi}?email=${EMAIL}`
  try {
    const result = await axios(url)
    if (result.status === 200) {
      // this.results.title = result.data.title
      // this.$set(this.results, 'downloads', result.data.oa_locations[0])
      const downloadUrl = result.data.oa_locations[0].url_for_pdf
      if (downloadUrl !== null) {
        const MD5 = new jshashes.MD5
        const hash = MD5.hex(doi)        
        const sanitizedDoi = sanitize(doi)
        const filename = `${sanitizedDoi}-${hash}.pdf`
        await downloadFile(downloadUrl, '../data/pdfs/', {
          fileName: filename
        })
        return `../data/pdfs/${filename}`
      }
    }
  } catch (error) {
    console.log(`${error}`)
  } finally {
  }
  return null
}

const client = new ApolloClient({
  link: createHttpLink({
    uri: 'http://localhost:8002/v1/graphql',
    headers: {
      'x-hasura-admin-secret': 'mysecret'
    },
    fetch: fetch as any
  }),
  cache: new InMemoryCache()
})

async function main() {
  const objectsWithDois = await getDois(client)
  await pMap(objectsWithDois, async (value: any) => {
    console.log(`Downloading doi ${value.doi}`)
    const path = await downloadFromUnpaywall(value.doi)
    if (path !== null ) {
      console.log(path)
      await thumbnail(path, `${path}.jpg`)
    }
  }, { concurrency: 1 })
}

main()

