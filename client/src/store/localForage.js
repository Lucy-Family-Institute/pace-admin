import localforage from 'localforage'

export const localForageService = localforage.createInstance({
  name: 'mydatabase',
  version: 1.0,
  storeName: 'mystorageobj'
})

localForageService
  .setDriver([
    localforage.INDEXEDDB,
    localforage.WEBSQL,
    localforage.LOCALSTORAGE
  ]).then().catch(error => {
    console.error('Error setting up storage cache: ' + error)
  })

export default {
  localforage,
  localForageService
}
