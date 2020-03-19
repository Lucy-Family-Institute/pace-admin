import { ApolloClient, MutationOptions } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import { DownloaderHelper } from 'node-downloader-helper'
import fetch from 'node-fetch'
import gql from 'graphql-tag'
import axios from 'axios'
import _ from 'lodash'
import pMap from 'p-map'
import sanitize from 'sanitize-filename'
import fs from 'fs'
import PDF2Pic from 'pdf2pic'
import path from 'path'

const EMAIL = `pace@nd.edu`

// import crypto from 'crypto'
// export function hashStream ( dataStream ) {
//   return new Promise((resolve, reject) => {
//     const hashSha256 = crypto.createHash('sha256')
//     const hashMd5 = crypto.createHash('md5')
//     const hashSha1 = crypto.createHash('sha1')
//     let size = 0

//     dataStream.on('data', function (chunk) {
//       size += chunk.length
//       hashMd5.update(chunk)
//       hashSha1.update(chunk)
//       hashSha256.update(chunk)
//     })
//     dataStream.on('end', function () {
//       const md5 = hashMd5.digest().toString('hex')
//       const sha1 = hashSha1.digest().toString('hex')
//       const sha256 = hashSha256.digest().toString('hex')
//       resolve({
//         size,
//         md5,
//         sha1,
//         sha256
//       })
//     })
//     dataStream.on('error', function (err) {
//       reject(err)
//     })
//   })
// }

// async function hashFile (path) {
//   const fileStream = new fs.ReadStream(path)
//   const fileInfo = await hashStream(fileStream)
//   return fileInfo
// }

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

function makeFileNameFromDoi ( doi ) {
  const sanitizedDoi = sanitize(doi, { replacement: '_' })
  return `${sanitizedDoi}.pdf`
}

async function downloadFile ( url: string, directory: string, options: any ) {
  const dl = new DownloaderHelper(url, directory, options)
  return new Promise ( (resolve, reject) => {
    dl.on('end', () => resolve(true))
    dl.on('error', () => reject())
    dl.start()
  })
}

async function thumbnail ( input: string, directory: string, filename: string ) {
  const pdf2pic = new PDF2Pic({
    density: 72,           // output pixels per inch
    savename: filename,   // output file name
    savedir: directory,    // output file location
    format: "png",          // output file format
    size: "600x600"         // output size in pixels
  })
  // return new Promise ((resolve, reject) => {
  try {
    await pdf2pic.convert(input)
    return path.join(directory, filename)
  } catch (err) {
    console.error(`Thumbnail error for ${input}`)
    return null
  }

  // return new Promise ((resolve, reject) => {
  //   const stream = fs.createWriteStream(output)
  //   stream.on('finish', () => {
  //     resolve(output)
  //   })
  //   pdf(
  //     fs.readFileSync(input)
  //   ).then(data => {
  //     data.pipe(stream)
  //   }).catch(err => reject(err))
  // })
}

async function downloadFromUnpaywall (doi, directory, filename) {
  const url = `https://api.unpaywall.org/v2/${doi}?email=${EMAIL}`
  try {
    const result = await axios(url)
    if (result.status === 200) {
      const downloadUrl = _.get(result, 'data.oa_locations[0].url_for_pdf', null)
      if (downloadUrl !== null) {
        console.log(`Download ${downloadUrl}`)
        // const MD5 = new jshashes.MD5
        // const hash = MD5.hex(doi)        
        await downloadFile(downloadUrl, directory, {
          fileName: filename
        })
        const filePath = path.join(directory, filename)
        const fileBuffer = fs.readFileSync(filePath)
        const isPdf = Buffer.isBuffer(fileBuffer) && fileBuffer.lastIndexOf("%PDF-") === 0 && fileBuffer.lastIndexOf("%%EOF") > -1
        if ( !isPdf ) {
          console.error(`${doi} is not a PDF`)
          fs.unlinkSync(filePath)
          return null
        }
        return {
          // md5OfDoi: hash,
          filename,
          directory: directory,
          path: filePath
        }
      }
    }
  } catch (error) {
    console.log(`Download error ${doi}`)
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
    const filename = makeFileNameFromDoi(value.doi)
    if (!fs.existsSync(path.join('../data/pdfs', filename))) {
      const downloadInfo = await downloadFromUnpaywall(value.doi, '../data/pdfs', filename)
      if (downloadInfo !== null ) {
        await thumbnail(downloadInfo.path, '../data/thumbnails', `${downloadInfo.filename}`)
      }
    }
  }, { concurrency: 5 })
}

main()

