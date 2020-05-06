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
    console.log('Error setting up storage cache: ' + error)
  })
  //   () => {
  //   // use this to test your db connection - delete later
  //   localForageService.setItem("testkey", "testvalue", function() {
  //     console.log(
  //       "Of the driver options given, localforage is using:" +
  //         localForageService.driver()
  //     );
  //   });
  // }
  // ()

export default {
  localforage,
  localForageService
}
