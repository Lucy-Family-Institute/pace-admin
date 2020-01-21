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

              <q-expansion-item
                v-for="item in people"
                :key="item.id"
                :active="person!==undefined && item.id === person.id"
                clickable
                v-ripple
                @click="loadPublications(item)"
                active-class="bg-teal-1 text-grey-8"
              >
                <template v-slot:header>
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
                </template>
                <q-item-section>
                    <q-item-side right>Institution: {{ item.institution ? item.institution.name : 'undefined'}}</q-item-side>
                    <q-item-side right>Name Variants: {{ getNameVariants(item) }}</q-item-side>
                </q-item-section>
              </q-expansion-item>
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
                        <q-btn color="green" label="Accept" class="on-left" @click="reviewAccepted(person,publication)" />
                        <q-btn color="red" label="Reject" @click="reviewRejected(person,publication)" />
                        <q-btn color="grey" label="Unsure" class="on-right" @click="reviewUnsure(person,publication)" />
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
import insertReview from '../gql/insertReview'
import readUser from '../gql/readUser'
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
    person: undefined,
    user: undefined,
    username: undefined
  }),
  async created () {
    this.fetchData()
  },
  watch: {
    $route: 'fetchData'
  },
  methods: {
    async fetchData () {
      this.username = 'reviewer1'
      const userResult = await this.$apollo.query(readUser(this.username))
      if (userResult.data.users.length > 0) {
        this.user = userResult.data.users[0]
        console.log(`Loaded user: ${this.username}`)
      } else {
        console.error(`Could not load user ${this.username}`)
      }
      const personResult = await this.$apollo.query(readPersons())
      this.people = personResult.data.persons
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
    async addReview (person, publication, reviewAbbrev) {
      this.clearPublication()
      this.person = person
      this.publication = publication
      try {
        console.log(person.id)
        const mutateResult = await this.$apollo.mutate(
          insertReview(this.user.id, publication.persons_publications[0].id, reviewAbbrev)
        )
        console.log(mutateResult)
        if (mutateResult) {
          this.reviewed()
          return mutateResult
        }
      } catch (error) {
        console.log(error)
      } finally {
      }
    },
    async reviewAccepted (person, publication) {
      const mutateResult = this.addReview(person, publication, 'ACC')
      if (mutateResult) {
        console.log(`Incrementing accepted count for person id: ${person.id}`)
        this.$store.dispatch('admin/incrementAcceptedCount')
        console.log(`Accepted count is: ${this.$store.getters['admin/acceptedCount']}`)
      }
    },
    async reviewRejected (person, publication) {
      const mutateResult = this.addReview(person, publication, 'REJ')
      if (mutateResult) {
        console.log(`Incrementing rejected count for person id: ${person.id}`)
        this.$store.dispatch('admin/incrementRejectedCount')
        console.log(`Rejected count is: ${this.$store.getters['admin/rejectedCount']}`)
      }
    },
    async reviewUnsure (person, publication) {
      const mutateResult = this.addReview(person, publication, 'UNS')
      if (mutateResult) {
        console.log(`Incrementing unsure count for person id: ${person.id}`)
        this.$store.dispatch('admin/incrementUnsureCount')
        console.log(`Unsure count is: ${this.$store.getters['admin/unsureCount']}`)
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
    reviewed () {
      this.$store.dispatch('admin/incrementLogCount')
      const index = _.findIndex(this.publications, { id: this.publication.id })
      Vue.delete(this.publications, index)
      this.loadPublication(this.publications[index])
    },
    getNameVariants (person) {
      var variants = []
      variants[0] = `${person.family_name}, ${person.given_name.charAt(0)}`
      variants[1] = `${person.family_name}, ${person.given_name}`
      return variants
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
