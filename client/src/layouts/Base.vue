<template>
  <q-layout view="lHh lpr fFf">
    <!-- Skip links -->
    <nav class="skip-links" aria-label="Skip links">
      <ul>
        <li><a href="#content" accesskey="C" title="Skip to content = C">Skip To Content</a></li>
        <li><a href="#nav-top" accesskey="S" title="Skip to navigation = S">Skip To Navigation</a></li>
      </ul>
    </nav>
    <q-header elevated>
      <Header />
    </q-header>
    <q-page-container>
      <div class="wrapper" id="wrapper">
        <router-view v-if="isLoggedIn" />
        <Footer />
      </div>
    </q-page-container>
  </q-layout>
</template>

<script>
import { openURL } from 'quasar'
import { sync } from 'vuex-pathify'
import _ from 'lodash'
import axios from 'axios'

import Header from '@/components/edu.nd/Header.vue'
import Footer from '@/components/edu.nd/Footer.vue'

import readOrganizations from '../../../gql/readOrganizations.gql'

export default {
  name: 'MyLayout',
  components: {
    Header,
    Footer
  },
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

      if (this.isLoggedIn) {
        const results = await this.$apollo.query({
          query: readOrganizations
        })

        this.centerOptions = _.map(results.data.review_organization, (reviewOrg) => {
          return {
            label: reviewOrg.comment,
            value: reviewOrg.value
          }
        })
      }

      if (!this.selectedCenter) {
        this.selectedCenter = this.preferredSelectedCenter
      }
    }
  }
}
</script>

<style>
  .row {
    width: revert;
  }
  .white {
    color: white;
  }
  .tab {
    color: var(--brand-blue);
  }
</style>
