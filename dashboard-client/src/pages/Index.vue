<template>
  <q-page class="flex justify-center no-wrap">
    <q-splitter
      v-model="firstModel"
      unit="px"
      :style="{height: ($q.screen.height-56-16)+'px'}"
      disable
    >
      <template v-slot:before>
        <div class="q-pa-md row items-start q-gutter-md">
          <q-card class="my-card" flat bordered>
            <q-card-section>
              <apexchart :key="refreshCharts" :width="`${(dashboardMiniState) ? 250: $q.screen.width * .3}`" type="bar" :options="yearOptions" :series="yearSeries"></apexchart>
            </q-card-section>
          </q-card>
          <q-card class="my-card" flat bordered>
            <q-card-section>
              <apexchart :key="refreshCharts" :width="`${(dashboardMiniState) ? 250: $q.screen.width * .3}`" type="pie" :options="classificationOptions" :series="classificationSeries"></apexchart>
            </q-card-section>
          </q-card>
          <q-card class="my-card" flat bordered>
            <q-card-section>
              <apexchart :key="refreshCharts" :width="`${(dashboardMiniState) ? 250: $q.screen.width * .3}`" type="pie" :options="journalTypeOptions" :series="journalTypeSeries"></apexchart>
            </q-card-section>
          </q-card>
          <q-card class="my-card" flat bordered>
            <q-card-section>
              <apexchart :key="refreshCharts" :width="`${(dashboardMiniState) ? 250: $q.screen.width * .3}`" type="pie" :options="publisherOptions" :series="publisherSeries"></apexchart>
            </q-card-section>
          </q-card>
        </div>
      </template>
      <template v-slot:separator>
        <q-btn
            dense
            round
            unelevated
            color="teal"
            :icon="`${(dashboardMiniState) ? 'chevron_right' : 'chevron_left'}`"
            @click="toggleMiniState"
          />
      </template>
      <template v-slot:after :style="{height: ($q.screen.height-56-16)+'px'}">
        <div style="padding-top: 16px">
          <SearchView />
        </div>
      </template>
    </q-splitter>
  </q-page>
</template>

<script>
import { sync } from 'vuex-pathify'
import SearchView from '../components/SearchView.vue'

export default {
  name: 'PageIndex',
  components: {
    SearchView
  },
  data () {
    return {
      firstModel: 1000,
      search: '',
      processingTime: undefined,
      numberOfHits: undefined,
      results: []
    }
  },
  async created () {
    await this.init()
  },
  computed: {
    hint: function () {
      return this.results ? `${this.numberOfHits} hits in ${this.processingTime} ms` : ''
    },
    yearOptions: sync('filter/yearOptions'),
    yearSeries: sync('filter/yearSeries'),
    journalTypeOptions: sync('filter/journalTypeOptions'),
    journalTypeSeries: sync('filter/journalTypeSeries'),
    classificationOptions: sync('filter/classificationOptions'),
    classificationSeries: sync('filter/classificationSeries'),
    refreshCharts: sync('filter/refreshCharts'),
    journalOptions: sync('filter/journalOptions'),
    journalSeries: sync('filter/journalSeries'),
    publisherOptions: sync('filter/publisherOptions'),
    publisherSeries: sync('filter/publisherSeries'),
    dashboardMiniState: sync('filter/dashboardMiniState')
  },
  watch: {
    $route: 'init'
  },
  methods: {
    toggleMiniState (e) {
      // if in "mini" state and user
      // click on drawer, we switch it to "normal" mode
      this.dashboardMiniState = !this.dashboardMiniState
      this.firstModel = this.getFirstModelWidth(this.dashboardMiniState)
    },
    getFirstModelWidth (dashboardMiniState) {
      if (this.dashboardMiniState) {
        return this.$q.screen.width * 0.25
      } else {
        return this.$q.screen.width * 0.75
      }
    },
    async init () {
      this.firstModel = this.getFirstModelWidth(this.dashboardMiniState)
    }
  }
}
</script>

<style lang="sass" scoped>
.my-card
  width: 100%
  max-width: 450px
</style>
