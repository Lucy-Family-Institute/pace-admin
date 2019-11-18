<template>
    <div>
      <div class="q-pa-md">
      <div class="row">
        <div class="col">
              <q-scroll-area v-if="people" :style="{height: ($q.screen.height-50)+'px'}" style="max-width: 400px;">
    <q-list>
      <q-item-label header>People</q-item-label>

      <q-item v-for="item in people" :key="item.id" clickable v-ripple>
        <q-item-section avatar top>
          <q-avatar icon="folder" color="primary" text-color="white" />
        </q-item-section>

        <q-item-section>
          <q-item-label lines="1">{{ item.last_name }}, {{ item.first_name }}</q-item-label>
          <!-- <q-item-label caption>{{date.formatDate(new Date(item.dateModified), 'YYYY-MM-DD')}}</q-item-label> -->
        </q-item-section>

        <q-item-section side>
          <q-icon name="info" color="green" />
        </q-item-section>
      </q-item>

    </q-list>
    </q-scroll-area>
    </div>
    <div class="col">
    <q-scroll-area v-if="papers" :style="{height: ($q.screen.height-50)+'px'}" style="max-width: 400px;">
    <q-list>
      <q-item-label header>Papers</q-item-label>

      <q-item v-for="item in papers" :key="item.id" clickable v-ripple>
        <q-item-section avatar top>
          <q-avatar icon="folder" color="primary" text-color="white" />
        </q-item-section>

        <q-item-section>
          <q-item-label lines="1">{{ item.title }}</q-item-label>
          <!-- <q-item-label caption>{{date.formatDate(new Date(item.dateModified), 'YYYY-MM-DD')}}</q-item-label> -->
        </q-item-section>

        <q-item-section side>
          <q-icon name="info" color="green" />
        </q-item-section>
      </q-item>

    </q-list>
    </q-scroll-area>
    </div>
    </div>
    </div>
    </div>
</template>

<style>
</style>

<script>
import { dom, date } from 'quasar'
import readUsers from '../gql/readUsers'
// import * as service from '@porter/osf.io';

export default {
  name: 'PageIndex',
  data: () => ({
    dom,
    date,
    people: [],
    papers: []
  }),
  async created () {
    this.fetchData()
  },
  watch: {
    '$route': 'fetchData'
  },
  methods: {
    async fetchData () {
      const result = await this.$apollo.query({
        query: readUsers()
      })
      this.people = result.data.persons
    }
  }
}
</script>
