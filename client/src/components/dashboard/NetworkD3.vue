<template>
    <d3-network :key="graphKey" :net-nodes="nodes" :net-links="links" :options="options" />
</template>

<script>
import { sync } from 'vuex-pathify'
import D3Network from 'vue-d3-network'
import 'vue-d3-network/dist/vue-d3-network.css'
import _ from 'lodash'
import { debounce } from 'quasar'
import combinations from 'combinations'

export default {
  name: 'Network',
  components: {
    D3Network
  },
  data () {
    return {
      nodes: [],
      links: [],
      options: {
        nodeLabels: true
      }
    }
  },
  async created () {
    this.prepareResults = debounce(this.prepareResults, 200)
  },
  computed: {
    results: sync('dashboard/results'),
    graphKey: sync('dashboard/graphKey')
    // dashboardMiniState: sync('filter/dashboardMiniState'),
    // facetFilters: sync('filter/facetFilters'),
    // facetsDistribution: sync('filter/facetsDistribution')
    // // refreshCharts: sync('filter/refreshCharts')
  },
  watch: {
    $route: 'init',
    // facetsDistribution: async function () {
    //   this.updateGraphs()
    // }
    results: async function () {
      this.prepareResults()
    }
  },
  methods: {
    async init () {
      // this.prepareResults()
    },
    async prepareResults () {
      const links = []
      const names = []
      _.forEach(this.results, (result, i) => {
        _.forEach(result.authors, (author, j) => {
          if (!_.includes(names, author)) names.push(author)
          if (j > 0) {
            _.forEach(combinations(result.authors, 2, 2), (pair) => {
              links.push({
                tid: pair[0],
                sid: pair[1]
              })
            })
          }
        })
      })
      this.nodes = Object.freeze(_.map(names, (name) => {
        return {
          id: name,
          name
        }
      }))
      this.links = Object.freeze(links)
    }
  }
}
</script>
