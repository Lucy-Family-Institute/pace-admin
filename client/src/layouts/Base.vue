<template>
  <q-layout view="hHh lpR fFf">
    <q-header>
      <Header />
    </q-header>
    <q-page-container style="padding-top: 80px;">
      <q-page>
        <router-view />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<style>
  /* .row {
    width: revert;
  }
  .white {
    color: white;
  }
  .tab {
    color: var(--brand-blue);
  } */
</style>

<script>
import { openURL } from 'quasar'
import { sync } from 'vuex-pathify'

import Header from '@/components/edu.nd/Header.vue'

import readOrganizations from '@gql/readOrganizations.gql'

export default {
  name: 'MyLayout',
  components: {
    Header
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
      const results = await this.$apollo.query({
        query: readOrganizations
      })

      this.centerOptions = results.data.review_organization.map((reviewOrg) => {
        return {
          label: reviewOrg.comment,
          value: reviewOrg.value
        }
      })
    }
  }
}
</script>
