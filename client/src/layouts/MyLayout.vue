<template>
  <q-layout view="lHh lpr fFf">
    <q-header elevated>
      <q-toolbar>
        <q-avatar  size="32px">
          <img src="~/assets/nd-logo.png">
        </q-avatar>
        <q-toolbar-title shrink>
          PACE
        </q-toolbar-title>
        <q-separator vertical inset/>

        <q-space/>
        <q-select
          v-model="model"
          :options="options"
          class="white"
          v-if="isLoggedIn"
        />

        <q-btn-group unelevated spread>
          <q-separator class="gt-sm" vertical inset/>
          <q-btn
            dense
            flat
            label="Logout"
            type="a" href="/logout"
            v-if="isLoggedIn"
          />
          <q-btn
            dense
            flat
            label="Login"
            type="a" href="/login"
            v-else
          />
        </q-btn-group>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view v-if="isLoggedIn" />
    </q-page-container>
  </q-layout>
</template>

<script>
import { openURL } from 'quasar'
import { sync } from 'vuex-pathify'
import _ from 'lodash'
import axios from 'axios'

export default {
  name: 'MyLayout',
  data () {
    return {
      model: 'Harper Cancer Research Institute',
      options: [ 'Harper Cancer Research Institute' ]
    }
  },
  async created () {
    await this.syncSessionAndStore()
  },
  watch: {
    $route: 'syncSessionAndStore'
  },
  computed: {
    isLoggedIn: sync('auth/isLoggedIn'),
    userId: sync('auth/userId')
  },
  methods: {
    openURL,
    async syncSessionAndStore () {
      if (
        this.isLoggedIn === null ||
        (this.isLoggedIn === true && this.userId === null)
      ) {
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
      } else if (this.isLoggedIn === false) {
        this.userId = null
      }
    }
  }
}
</script>

<style>
  .white {
    color: white;
  }
</style>
