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
        <q-tabs v-if="isLoggedIn">
          <q-route-tab name="person"
            icon="group"
            to="/"
            exact
          />
          <q-route-tab name="center"
            icon="account_balance"
            to="/center_review"
            exact
          />
          <q-tab
            icon="poll"
            @click="openDashboard()"
            exact
          />
        </q-tabs>
        <q-space/>
        <q-select
          v-model="selectedCenter"
          :options="centerOptions"
          class="white"
          v-if="isLoggedIn"
          map-options
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

import readOrganizations from '../../../gql/readOrganizations.gql'

export default {
  name: 'MyLayout',
  data () {
    return {
      // selectedCenter: 'Harper Cancer Research Institute',
      // options: [{
      //   label: 'Harper Cancer Research Institute',
      //   value: 'HCRI'
      // }]
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
    userId: sync('auth/userId'),
    centerOptions: sync('filter/centerOptions'),
    selectedCenter: sync('filter/selectedCenter'),
    preferredSelectedCenter: sync('filter/preferredSelectedCenter')
  },
  methods: {
    openURL,
    async openDashboard () {
      openURL(process.env.DASHBOARD_BASE_URL)
    },
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

      const results = await this.$apollo.query({
        query: readOrganizations
      })

      this.centerOptions = _.map(results.data.review_organization, (reviewOrg) => {
        return {
          label: reviewOrg.comment,
          value: reviewOrg.value
        }
      })

      if (!this.selectedCenter) {
        this.selectedCenter = this.preferredSelectedCenter
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
