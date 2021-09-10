<template>
  <q-scroll-area
    v-if="publication"
    :style="{height: ($q.screen.height-50)+'px'}"
  >
    <ul>
      <li v-for="link in links" :key="link.id"><a :href="link.url">Google the title</a></li>
      <li v-if="unpaywall"><a :href="unpaywall">PDF</a></li>
    </ul>
    <vue-friendly-iframe v-if="url" :src="url"></vue-friendly-iframe>
  </q-scroll-area>
</template>

<script>
import VueFriendlyIframe from 'vue-friendly-iframe'

export default {
  name: 'PageIndex',
  props: ['person', 'publication'],
  components: {
    'vue-friendly-iframe': VueFriendlyIframe
  },
  data: () => ({
    links: [],
    url: undefined,
    unpaywall: undefined
  })
}
</script>