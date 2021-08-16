<template>
    <router-view />
</template>

<script>
import { sync } from 'vuex-pathify'
import axios from 'axios'
import _ from 'lodash'

export default {
  computed: {
    isLoggedIn: sync('auth/isLoggedIn')
  },
  async mounted () {
    try {
      const response = await axios({ url: '/session', method: 'GET' })
      if (_.get(response.data, 'databaseId') !== undefined) {
        this.isLoggedIn = true
        this.userId = response.data.databaseId
      } else {
        this.isLoggedIn = false
        this.userId = null
      }
    } catch (error) { // TODO specify the error
      // this.isBackendDisconnected = true
    }
  }
}
</script>
