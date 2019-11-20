<template>
  <div>
    <div class="q-pa-md">
      <q-splitter
        v-model="firstModel"
        :style="{height: ($q.screen.height-50)+'px'}"
      >
        <template v-slot:before>
          <q-scroll-area
            v-if="people"
            :style="{height: ($q.screen.height-50)+'px'}"
          >
            <q-list>
              <q-item-label header>People</q-item-label>

              <q-item
                v-for="item in people"
                :key="item.id"
                clickable
                v-ripple
                @click="loadPublications(item.id)"
              >
                <q-item-section avatar top>
                  <q-avatar icon="person" color="primary" text-color="white" />
                </q-item-section>

                <q-item-section>
                  <q-item-label lines="1">{{ item.family_name }}, {{ item.given_name }}</q-item-label>
                  <!-- <q-item-label caption>{{date.formatDate(new Date(item.dateModified), 'YYYY-MM-DD')}}</q-item-label> -->
                </q-item-section>

                <q-item-section side>
                  <q-icon name="keyboard_arrow_right" color="green" />
                </q-item-section>
              </q-item>
            </q-list>
          </q-scroll-area>
        </template>
        <template v-slot:after>
          <q-splitter
            v-model="secondModel"
            :style="{height: ($q.screen.height-50)+'px'}"
          >
            <template v-slot:before>
              <q-scroll-area
                v-if="publications"
                :style="{height: ($q.screen.height-50)+'px'}"
              >
                <q-list>
                  <q-item-label header>Publications</q-item-label>

                  <q-expansion-item v-for="item in publications" :key="item.id" clickable @click="loadPublication(item)" group="expansion_group">
                    <template v-slot:header>

                      <q-item-section avatar top>
                        <q-checkbox v-if="$store.getters['admin/isBulkEditing']" v-model="checkedPublications" :val="item.id" />
                        <q-avatar icon="description" color="primary" text-color="white" v-else />
                      </q-item-section>

                      <q-item-section>
                        <q-item-label lines="1">{{ item.title }}</q-item-label>
                        <!-- <q-item-label caption>{{date.formatDate(new Date(item.dateModified), 'YYYY-MM-DD')}}</q-item-label> -->
                      </q-item-section>

                      <q-item-section side>
                        <q-badge label="99%" />
                      </q-item-section>

                      <!-- <q-item-section side>
                        <q-icon name="keyboard_arrow_right" color="green" />
                      </q-item-section> -->
                    </template>
                    <q-card>
                      <q-card-section class="text-center">
                        <q-btn color="green" label="Accept" class="on-left" />
                        <q-btn color="red" label="Reject" />
                        <q-btn color="grey" label="Unsure" class="on-right" />
                      </q-card-section>
                    </q-card>
                  </q-expansion-item>
                </q-list>
              </q-scroll-area>
            </template>
            <template v-slot:after>
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
          </q-splitter>
        </template>
      </q-splitter>
    </div>
  </div>
</template>

<style>
  iframe {
    height: 600px
  }
</style>

<script>
import { dom, date } from 'quasar'
import readUsers from '../gql/readUsers'
import readPublicationsByPerson from '../gql/readPublicationsByPerson'
// import * as service from '@porter/osf.io';

export default {
  name: 'PageIndex',
  data: () => ({
    dom,
    date,
    firstModel: 33,
    secondModel: 50,
    people: [],
    publications: [],
    publication: undefined,
    links: [],
    checkedPublications: [],
    url: undefined,
    unpaywall: undefined
  }),
  async created () {
    this.fetchData()
  },
  watch: {
    $route: 'fetchData'
  },
  methods: {
    async fetchData () {
      const result = await this.$apollo.query(readUsers())
      this.people = result.data.persons
    },
    async loadPublications (id) {
      this.clearPublication()
      const result = await this.$apollo.query(readPublicationsByPerson(id))
      this.publications = result.data.publications
    },
    async loadPublication (publication) {
      this.clearPublication()
      this.publication = publication
      this.links.push({
        id: 1,
        url: `https://www.google.com/search?igu=1&q=${publication.title}`
      })
      this.url = `https://www.google.com/search?igu=1&q=${publication.title}`
      try {
        const result = await this.$axios(`https://api.unpaywall.org/v2/${publication.doi}?email=testing@unpaywall.org`)
        if (result.status === 200) {
          // this.results.title = result.data.title
          // this.$set(this.results, 'downloads', result.data.oa_locations[0])
          this.unpaywall = result.data.oa_locations[0].url_for_pdf
        }
      } catch (error) {
        console.log(error)
      } finally {
      }
    },
    clearPublication () {
      this.publication = undefined
      this.links = []
      this.url = undefined
    }
  }
}
</script>
