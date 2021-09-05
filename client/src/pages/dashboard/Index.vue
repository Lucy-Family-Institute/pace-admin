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
              <apexchart style="max-width:425px" :width="`${(dashboardMiniState) ? 250: 425}`" type="bar" :options="yearBarOptions" :series="yearBarSeries"></apexchart>
            </q-card-section>
          </q-card>
          <q-card class="my-card" flat bordered>
            <q-card-section>
              <apexchart style="max-width:425px" :width="`${(dashboardMiniState) ? 250: 425}`" type="pie" :options="impactFactorPieOptions" :series="impactFactorPieSeries"></apexchart>
            </q-card-section>
          </q-card>
          <q-card class="my-card" flat bordered>
            <q-card-section>
              <apexchart style="max-width:425px" :width="`${(dashboardMiniState) ? 250: 425}`" type="pie" :options="classificationPieOptions" :series="classificationPieSeries"></apexchart>
            </q-card-section>
          </q-card>
          <q-card class="my-card" flat bordered>
            <q-card-section>
              <apexchart style="max-width:425px" :width="`${(dashboardMiniState) ? 250: 425}`" type="pie" :options="journalTypePieOptions" :series="journalTypePieSeries"></apexchart>
            </q-card-section>
          </q-card>
          <!-- <q-card class="my-card" flat bordered>
            <q-card-section>
              <apexchart style="max-width:425px" :width="`${(dashboardMiniState) ? 250: 425}`" type="pie" :options="publisherPieOptions" :series="publisherPieSeries"></apexchart>
            </q-card-section>
          </q-card> -->
          <q-card v-if="dashboardMiniState" class="my-card" flat bordered>
            <q-card-section style="max-width:250px" :width="250">
              <NetworkD3 />
             </q-card-section>
          </q-card>
          <q-card v-if="!dashboardMiniState" class="graph-card" flat bordered>
            <q-card-section style="max-width:915px" :width="915">
              <NetworkD3 />
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

<style lang="scss">
.my-card {
  width: 100%;
  max-width: 450px;
}
.graph-card {
  width: 100%;
  max-width: 915px;
}

.clickable {
  text-decoration: underline;
  cursor: pointer;
}
</style>

<script>
import { sync } from 'vuex-pathify'
import SearchView from '@/components/dashboard/SearchView.vue'
import NetworkD3 from '@/components/dashboard/NetworkD3.vue'
import _ from 'lodash'
import { debounce } from 'quasar'

export default {
  name: 'PageIndex',
  components: {
    NetworkD3,
    SearchView
  },
  data () {
    return {
      firstModel: 1000,
      yearBarOptions: {
        chart: {
          events: {
            dataPointSelection: function (event, chartContext, config) {
              this.addFacetFilter('year', config.w.globals.labels[config.dataPointIndex])
            }.bind(this),
            click: function ({ clientX, clientY }, chartContext, { config, globals }) {
              const xCoords = globals.seriesXvalues[0]
              const categories = config.xaxis.categories
              // Find the x-axis + translation closest to the click
              const categoryIndex = _.indexOf(xCoords, _.reduce(xCoords, function (prev, curr) {
                return (Math.abs(curr + globals.translateX - clientX) < Math.abs(prev + globals.translateX - clientX) ? curr : prev)
              }))
              this.addFacetFilter('year', categories[categoryIndex])
            }.bind(this)
          }
        },
        tooltip: {
          enabled: false
        },
        xaxis: {
          categories: [2017, 2018, 2019, 2020],
          labels: {
            style: {
              cssClass: 'clickable'
            }
          }
        },
        title: {
          text: 'Year',
          align: 'left',
          margin: 10,
          offsetX: 0,
          offsetY: 0,
          floating: false,
          style: {
            fontSize: '18px',
            fontWeight: 'bold',
            fontFamily: undefined,
            color: '#263238'
          }
        }
      },
      yearBarSeries: [{
        data: [2017, 2018, 2019, 2020]
      }],
      classificationPieOptions: {
        chart: {
          type: 'pie',
          events: {
            dataPointSelection: function (event, chartContext, config) {
              this.addFacetFilter('classificationsTopLevel', config.w.globals.labels[config.dataPointIndex])
            }.bind(this)
          },
          toolbar: {
            show: true,
            tools: {
              download: true
            }
          }
        },
        tooltip: {
          enabled: true
        },
        dataLabels: {
          formatter: function (val, opt) {
            return _.truncate(opt.w.globals.labels[opt.seriesIndex], { length: 15 })
          }
        },
        legend: {
          show: false
        },
        labels: [],
        title: {
          text: 'Subjects',
          align: 'left',
          margin: 10,
          offsetX: 0,
          offsetY: 0,
          floating: false,
          style: {
            fontSize: '18px',
            fontWeight: 'bold',
            fontFamily: undefined,
            color: '#263238'
          }
        }
      },
      classificationPieSeries: [],
      impactFactorPieOptions: {
        chart: {
          type: 'pie',
          events: {
            dataPointSelection: function (event, chartContext, config) {
              this.addFacetFilter('impact_factor_range', config.w.globals.labels[config.dataPointIndex])
            }.bind(this)
          },
          toolbar: {
            show: true,
            tools: {
              download: true
            }
          }
        },
        tooltip: {
          enabled: true
        },
        dataLabels: {
          style: { color: 'black' },
          formatter: function (val, opt) {
            return _.truncate(opt.w.globals.labels[opt.seriesIndex], { length: 15 })
          }
        },
        legend: {
          show: false
        },
        labels: [],
        title: {
          text: 'Journal Impact Factor',
          align: 'left',
          margin: 10,
          offsetX: 0,
          offsetY: 0,
          floating: false,
          style: {
            fontSize: '18px',
            fontWeight: 'bold',
            fontFamily: undefined,
            color: '#263238'
          }
        }
      },
      impactFactorPieSeries: [],
      journalTypePieOptions: {
        chart: {
          type: 'pie',
          events: {
            dataPointSelection: function (event, chartContext, config) {
              this.addFacetFilter('journal_type', config.w.globals.labels[config.dataPointIndex])
            }.bind(this)
          },
          toolbar: {
            show: true,
            tools: {
              download: true
            }
          }
        },
        tooltip: {
          enabled: true
        },
        dataLabels: {
          formatter: function (val, opt) {
            return _.truncate(opt.w.globals.labels[opt.seriesIndex], { length: 15 })
          }
        },
        legend: {
          show: false
        },
        labels: ['Journal', 'Book Series'],
        title: {
          text: 'Publication Type',
          align: 'left',
          margin: 10,
          offsetX: 0,
          offsetY: 0,
          floating: false,
          style: {
            fontSize: '18px',
            fontWeight: 'bold',
            fontFamily: undefined,
            color: '#263238'
          }
        }
      },
      journalTypePieSeries: [2017, 2018, 2019, 2020]
      // publisherPieOptions: {
      //   chart: {
      //     type: 'pie',
      //     events: {
      //       dataPointSelection: function (event, chartContext, config) {
      //         this.addFacetFilter('publisher', config.w.globals.labels[config.dataPointIndex])
      //       }.bind(this)
      //     },
      //     toolbar: {
      //       show: true,
      //       tools: {
      //         download: true
      //       }
      //     }
      //   },
      //   tooltip: {
      //     enabled: true
      //   },
      //   dataLabels: {
      //     formatter: function (val, opt) {
      //       return _.truncate(opt.w.globals.labels[opt.seriesIndex], { length: 15 })
      //     }
      //   },
      //   legend: {
      //     show: false
      //   },
      //   labels: ['Cambridge University Press', 'Ave Maria Press']
      // },
      // publisherPieSeries: ['Cambridge University Press', 'Ave Maria Press'],
      // title: {
      //   text: 'Publisher',
      //   align: 'left',
      //   margin: 10,
      //   offsetX: 0,
      //   offsetY: 0,
      //   floating: false,
      //   style: {
      //     fontSize: '18px',
      //     fontWeight: 'bold',
      //     fontFamily: undefined,
      //     color: '#263238'
      //   }
      // }
    }
  },
  async created () {
    await this.init()
    this.updateGraphs = debounce(this.updateGraphs, 500)
  },
  computed: {
    graphKey: sync('dashboard/graphKey'),
    dashboardMiniState: sync('dashboard/dashboardMiniState'),
    facetFilters: sync('dashboard/facetFilters'),
    facetsDistribution: sync('dashboard/facetsDistribution')
    // refreshCharts: sync('dashboard/refreshCharts')
  },
  watch: {
    $route: 'init',
    facetsDistribution: async function () {
      this.updateGraphs()
    },
    dashboardMiniState: async function () {
      this.updateModelWidth()
    }
  },
  methods: {
    makeStartCase (word) {
      // doing this instead of lodash startcase as that removes characters
      return word.replace(/\w+/g, _.capitalize)
    },
    updateModelWidth () {
      this.firstModel = this.getFirstModelWidth(this.dashboardMiniState)
    },
    toggleMiniState (e) {
      // if in "mini" state and user
      // click on drawer, we switch it to "normal" mode
      this.dashboardMiniState = !this.dashboardMiniState
      this.graphKey += 1
      this.updateModelWidth()
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
    },
    async addFacetFilter (key, value) {
      if (_.includes(this.facetFilters, `${key}:${value}`)) return
      if (key === 'year') {
        this.removeFacetFilter(_.find(this.facetFilters, (val) => _.startsWith(val, key)))
      }
      this.facetFilters.push(`${key}:${value}`)
      this.dashboardMiniState = true
    },
    async removeFacetFilter (key) {
      this.$delete(this.facetFilters, _.indexOf(this.facetFilters, key))
    },
    async updateGraphs () {
      this.yearBarOptions = {
        chart: {
          events: {
            dataPointSelection: function (event, chartContext, config) {
              this.addFacetFilter('year', config.w.globals.labels[config.dataPointIndex])
            }.bind(this),
            click: function ({ clientX, clientY }, chartContext, { config, globals }) {
              const xCoords = globals.seriesXvalues[0]
              const categories = config.xaxis.categories
              // Find the x-axis + translation closest to the click
              const categoryIndex = _.indexOf(xCoords, _.reduce(xCoords, function (prev, curr) {
                return (Math.abs(curr + globals.translateX - clientX) < Math.abs(prev + globals.translateX - clientX) ? curr : prev)
              }))
              this.addFacetFilter('year', categories[categoryIndex])
            }.bind(this)
          }
        },
        tooltip: {
          enabled: false
        },
        xaxis: {
          categories: _.keys(this.facetsDistribution.year),
          labels: {
            style: {
              cssClass: 'clickable'
            }
          }
        },
        title: {
          text: 'Year',
          align: 'left',
          margin: 10,
          offsetX: 0,
          offsetY: 0,
          floating: false,
          style: {
            fontSize: '18px',
            fontWeight: 'bold',
            fontFamily: undefined,
            color: '#263238'
          }
        }
      }
      this.yearBarSeries = [{
        data: _.values(this.facetsDistribution.year)
      }]
      const classificationData = _.orderBy(
        _.map(this.facetsDistribution.classificationsTopLevel, (value, key) => {
          return { name: key, count: value }
        }),
        'count',
        'desc'
      )
      this.classificationPieSeries = _.map(classificationData, 'count')
      this.classificationPieOptions = {
        chart: {
          type: 'pie',
          events: {
            dataPointSelection: function (event, chartContext, config) {
              this.addFacetFilter('classificationsTopLevel', config.w.globals.labels[config.dataPointIndex])
            }.bind(this)
          },
          toolbar: {
            show: true,
            tools: {
              download: true
            }
          }
        },
        labels: _.map(_.map(classificationData, 'name'), this.makeStartCase),
        legend: {
          show: false
        },
        dataLabels: {
          formatter: function (val, opt) {
            return _.truncate(opt.w.globals.labels[opt.seriesIndex], { length: 15 })
          }
        },
        tooltip: {
          enabled: true
        },
        title: {
          text: 'Subjects',
          align: 'left',
          margin: 10,
          offsetX: 0,
          offsetY: 0,
          floating: false,
          style: {
            fontSize: '18px',
            fontWeight: 'bold',
            fontFamily: undefined,
            color: '#263238'
          }
        }
      }
      this.impactFactorPieSeries = _.values(this.facetsDistribution.impact_factor_range)
      this.impactFactorPieOptions = {
        chart: {
          type: 'pie',
          events: {
            dataPointSelection: function (event, chartContext, config) {
              this.addFacetFilter('impact_factor_range', config.w.globals.labels[config.dataPointIndex])
            }.bind(this)
          },
          toolbar: {
            show: true,
            tools: {
              download: true
            }
          }
        },
        labels: _.map(_.keys(this.facetsDistribution.impact_factor_range), this.makeStartCase),
        legend: {
          show: false
        },
        dataLabels: {
          style: { color: '#FFFFFF' },
          formatter: function (val, opt) {
            return _.truncate(opt.w.globals.labels[opt.seriesIndex], { length: 15 })
          }
        },
        tooltip: {
          enabled: true
        },
        title: {
          text: 'Journal Impact Factor',
          align: 'left',
          margin: 10,
          offsetX: 0,
          offsetY: 0,
          floating: false,
          style: {
            fontSize: '18px',
            fontWeight: 'bold',
            fontFamily: undefined,
            color: '#263238'
          }
        }
      }
      this.journalTypePieSeries = _.values(this.facetsDistribution.journal_type)
      this.journalTypePieOptions = {
        chart: {
          type: 'pie',
          events: {
            dataPointSelection: function (event, chartContext, config) {
              this.addFacetFilter('journal_type', config.w.globals.labels[config.dataPointIndex])
            }.bind(this)
          },
          toolbar: {
            show: true,
            tools: {
              download: true
            }
          }
        },
        labels: _.map(_.keys(this.facetsDistribution.journal_type), this.makeStartCase),
        legend: {
          show: false
        },
        dataLabels: {
          formatter: function (val, opt) {
            return _.truncate(opt.w.globals.labels[opt.seriesIndex], { length: 15 })
          }
        },
        tooltip: {
          enabled: true
        },
        title: {
          text: 'Publication Type',
          align: 'left',
          margin: 10,
          offsetX: 0,
          offsetY: 0,
          floating: false,
          style: {
            fontSize: '18px',
            fontWeight: 'bold',
            fontFamily: undefined,
            color: '#263238'
          }
        }
      }
      // const publisherData = _.orderBy(
      //   _.map(this.facetsDistribution.publisher, (value, key) => {
      //     return { name: key, count: value }
      //   }),
      //   'count',
      //   'desc'
      // )
      // this.publisherPieSeries = _.map(publisherData, 'count')
      // this.publisherPieOptions = {
      //   chart: {
      //     type: 'pie',
      //     events: {
      //       dataPointSelection: function (event, chartContext, config) {
      //         this.addFacetFilter('publisher', config.w.globals.labels[config.dataPointIndex])
      //       }.bind(this)
      //     },
      //     toolbar: {
      //       show: true,
      //       tools: {
      //         download: true
      //       }
      //     }
      //   },
      //   labels: _.map(_.map(publisherData, 'name'), this.makeStartCase),
      //   legend: {
      //     show: false
      //   },
      //   dataLabels: {
      //     formatter: function (val, opt) {
      //       return _.truncate(opt.w.globals.labels[opt.seriesIndex], { length: 15 })
      //     }
      //   },
      //   tooltip: {
      //     enabled: true
      //   },
      //   title: {
      //     text: 'Publisher',
      //     align: 'left',
      //     margin: 10,
      //     offsetX: 0,
      //     offsetY: 0,
      //     floating: false,
      //     style: {
      //       fontSize: '18px',
      //       fontWeight: 'bold',
      //       fontFamily: undefined,
      //       color: '#263238'
      //     }
      //   }
      // }
    }
  }
}
</script>
