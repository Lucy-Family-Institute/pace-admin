<template>
  <div></div>
</template>

<script>
/* eslint-disable */
import { sync } from 'vuex-pathify'
// import _ from 'lodash'
import { debounce } from 'quasar'
// import combinations from 'combinations'
import cytoscape from 'cytoscape'
import euler from 'cytoscape-euler'

cytoscape.use( euler );

export default {
  name: 'NetworkCytoscape',
  components: {
  },
  data () {
    return {
      nodes: [],
      links: [],
      config: {
      },
      cy: null,
      graph: [
        { "data": {"id":"a","type":"person","label":"Sara Ceballos","isCenterMember":"false"}},
        { "data":{"id":"b","type":"person","label":"Joe Smith","isCenterMember":"false"}},
        { "data":{"id":"a-b","source":"a","target":"b"}}
      ]
    }
  },
  async created () {
    this.prepareResults = debounce(this.prepareResults, 200)
  },
  computed: {
    results: sync('dashboard/results')
  },
  mounted () {
    
    const el = document.createElement('div')
    el.setAttribute('id', 'cytoscape-div')
    el.setAttribute('width', '100%')
    el.setAttribute('style', 'min-height: 600px;')
    this.$el.appendChild(el)
    this.cy = cytoscape({ container: el, ...this.config })
    console.log(mounted)
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
      // const links = []
      // const names = []
      // _.forEach(this.results, (result, i) => {
      //   _.forEach(result.authors, (author, j) => {
      //     if (!_.includes(names, author)) names.push(author)
      //     if (j > 0) {
      //       _.forEach(combinations(result.authors, 2, 2), (pair) => {
      //         links.push({
      //           tid: pair[0],
      //           sid: pair[1]
      //         })
      //       })
      //     }
      //   })
      // })
      // this.nodes = Object.freeze(_.map(names, (name) => {
      //   return {
      //     id: name,
      //     name
      //   }
      // }))
      // this.links = Object.freeze(links)
      // console.log(this.cy)
      this.cy.data(this.graph)
    }
  }
}
</script>

<style lang="sass" scoped>
</style>
