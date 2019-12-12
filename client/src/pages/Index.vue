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
                :active="person!==undefined && item.id === person.id"
                clickable
                v-ripple
                @click="loadPublications(item)"
                active-class="bg-teal-1 text-grey-8"
              >
                <q-item-section avatar top>
                  <q-avatar icon="person" color="primary" text-color="white" />
                </q-item-section>

                <q-item-section>
                  <q-item-label lines="1">{{ item.family_name }}, {{ item.given_name }} ({{ item.persons_publications_aggregate.aggregate.count }})</q-item-label>
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
                  <q-item-label header>
                    <q-input v-if="person" v-model="search" label="">
                      <template v-slot:append>
                        <q-icon name="search" />
                      </template>
                    </q-input>
                  </q-item-label>
                  <q-expansion-item
                    v-for="item in filteredPublications"
                    :key="item.id"
                    clickable
                    @click="loadPublication(item)"
                    group="expansion_group"
                    :active="publication !== undefined && item.id === publication.id"
                    active-class="bg-teal-1 text-grey-8"
                  >
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
                        <q-badge
                          :label="item.persons_publications[0].confidence*100+'%'"
                          :color="item.persons_publications[0].confidence*100 <= 50 ? 'orange' : 'green'"
                        />
                      </q-item-section>

                      <!-- <q-item-section side>
                        <q-icon name="keyboard_arrow_right" color="green" />
                      </q-item-section> -->
                    </template>
                    <q-card>
                      <q-card-section class="text-center">
                        <q-btn color="green" label="Accept" class="on-left" @click="accept" />
                        <q-btn color="red" label="Reject" @click="reject" />
                        <q-btn color="grey" label="Unsure" class="on-right" @click="unsure" />
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
                <div class="q-pa-lg row items-start q-gutter-md">
                  <q-card class="my-card col-xs-4" style="width:200px; min-height:300px">
                    <img src="~assets/google_logo.svg" class="q-pa-md" style="padding-top:50px;">

                    <q-list>
                      <q-item clickable>
                        <q-item-section avatar>
                          <q-icon color="primary" name="account_box" />
                        </q-item-section>

                        <q-item-section @click="google1()">
                          <q-item-label>Title + Author</q-item-label>
                          <!-- <q-item-label caption>Have a drink.</!-->
                        </q-item-section>
                      </q-item>
                      <q-item clickable>
                        <q-item-section avatar>
                          <q-icon color="primary" name="account_balance" />
                        </q-item-section>

                        <q-item-section @click="google2()">
                          <q-item-label>+ Notre Dame</q-item-label>
                          <!-- <q-item-label caption>Have a drink.</!-->
                        </q-item-section>
                      </q-item>
                      <q-item clickable>
                        <q-item-section avatar>
                          <q-icon color="primary" name="account_balance" />
                        </q-item-section>

                        <q-item-section @click="google3()">
                          <q-item-label>+ nd.edu</q-item-label>
                          <!-- <q-item-label caption>Have a drink.</!-->
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </q-card>

                  <q-card class="my-card col-xs-4" style="width:200px; min-height:300px" v-if="unpaywall">
                    <img src="~/assets/Icon-pdf.svg" class="q-pa-lg">

                    <q-card-actions align="around">
                      <q-btn flat round color="primary" icon="link" @click="pdf()"/>
                      <q-btn flat round color="primary" icon="cloud_download" />
                    </q-card-actions>
                  </q-card>
                </div>
                <q-dialog
                  v-model="dialog"
                  persistent
                  :maximized="maximizedToggle"
                  transition-show="slide-up"
                  transition-hide="slide-down"
                >
                  <q-card class="bg-primary text-white">
                    <q-bar>
                      <q-space />

                      <q-btn dense flat icon="minimize" @click="maximizedToggle = false" :disable="!maximizedToggle">
                        <q-tooltip v-if="maximizedToggle" content-class="bg-white text-primary">Minimize</q-tooltip>
                      </q-btn>
                      <q-btn dense flat icon="crop_square" @click="maximizedToggle = true" :disable="maximizedToggle">
                        <q-tooltip v-if="!maximizedToggle" content-class="bg-white text-primary">Maximize</q-tooltip>
                      </q-btn>
                      <q-btn dense flat icon="close" v-close-popup>
                        <q-tooltip content-class="bg-white text-primary">Close</q-tooltip>
                      </q-btn>
                    </q-bar>
                    <q-card-section style="padding:0; margin:0">
                      <vue-friendly-iframe :src="url" :style="{'--height': ($q.screen.height-33)+'px'}"></vue-friendly-iframe>
                    </q-card-section>
                  </q-card>
                </q-dialog>
              </q-scroll-area>
            </template>
          </q-splitter>
        </template>
      </q-splitter>
    </div>
  </div>
</template>

<style>
  .vue-friendly-iframe iframe {
    padding: 0;
    margin: 0;
    width: 100%;
    height: var(--height);
  }
</style>

<script>
import Vue from 'vue'
import { dom, date } from 'quasar'
import readPersons from '../gql/readPersons'
import readPublicationsByPerson from '../gql/readPublicationsByPerson'
import _ from 'lodash'
// import * as service from '@porter/osf.io';

export default {
  name: 'PageIndex',
  data: () => ({
    search: '',
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
    unpaywall: undefined,
    dialog: false,
    maximizedToggle: true,
    person: undefined
  }),
  async created () {
    this.fetchData()
  },
  watch: {
    $route: 'fetchData'
  },
  methods: {
    async fetchData () {
      const result = await this.$apollo.query(readPersons())
      this.people = result.data.persons
    },
    async loadPublications (item) {
      this.clearPublication()
      this.person = item
      const result = await this.$apollo.query(readPublicationsByPerson(item.id))
      this.publications = result.data.publications
    },
    async loadPublication (publication) {
      this.clearPublication()
      this.publication = publication
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
    google1 () {
      const query = _.trim(`${this.person.family_name} ${this.publication.title}`)
      this.url = `https://www.google.com/search?igu=1&q=${_.replace(query, / +/, '+')}`
      this.displayUrl()
    },
    google2 () {
      const query = _.trim(`${this.person.family_name} Notre Dame ${this.publication.title}`)
      this.url = `https://www.google.com/search?igu=1&q=${_.replace(query, / +/, '+')}`
      this.displayUrl()
    },
    google3 () {
      const query = _.trim(`${this.person.family_name} nd.edu ${this.publication.title}`)
      this.url = `https://www.google.com/search?igu=1&q=${_.replace(query, / +/, '+')}`
      this.displayUrl()
    },
    pdf () {
      this.url = this.unpaywall
      this.displayUrl()
    },
    displayUrl () {
      this.dialog = true
    },
    clearPublication () {
      this.unpaywall = undefined
      this.publication = undefined
      this.links = []
      this.url = undefined
    },
    accept () {
      this.$store.dispatch('admin/incrementLogCount')
      const index = _.findIndex(this.publications, { id: this.publication.id })
      Vue.delete(this.publications, index)
      this.loadPublication(this.publications[index])
    },
    reject () {
      this.accept()
    },
    unsure () {
      this.accept()
    }
  },
  computed: {
    filteredPublications () {
      return this.publications.filter(item => {
        return _.lowerCase(item.title).includes(this.search)
      })
    }
  }
}
</script>
