<template>
  <div class="q-pa-md">
    <q-range
      v-model="snap"
      :step="1"
      :min="1972"
      :max="2020"
      label-always
      snap
      @change="watchRange"
    />
  </div>
</template>

<script>
import { sync } from 'vuex-pathify'
export default {
  data () {
    return {
      snap: sync('filters/years')
    }
  },
  methods: {
    async watchRange () {
      console.log(this.snap.min, this.snap.max)
    }
  }
}
</script>

<style scoped>
</style>
