<template>
  <q-layout view="lHh lpr fFf">
    <q-header elevated class="glossy">
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          @click="leftDrawerOpen = !leftDrawerOpen"
          aria-label="Menu"
        >
          <q-icon name="menu" />
        </q-btn>

        <q-toolbar-title>
        </q-toolbar-title>

        <div></div>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      bordered
      content-class="bg-grey-2"
      behavior="desktop"
    >
      <q-list>
        <q-item clickable to="/">
          <q-item-section avatar>
            <q-icon name="card_travel" />
          </q-item-section>
          <q-item-section>
            <q-item-label>All Work</q-item-label>
          </q-item-section>
        </q-item>
        <q-item-label header>Accounts</q-item-label>
        <q-item clickable to="/packages">
          <q-item-section avatar>
            <q-icon name="school" />
          </q-item-section>
          <q-item-section>
            <q-item-label>OSF.io</q-item-label>
            <q-item-label caption>user: jeff@221b.io</q-item-label>
          </q-item-section>
        </q-item>
        <q-item-label header>Accounts</q-item-label>
        <q-item clickable to="/">
          <q-item-section avatar>
            <q-icon name="library_add" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Add Service</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
import { openURL } from 'quasar'

export default {
  name: 'MyLayout',
  data () {
    return {
      leftDrawerOpen: this.$q.platform.is.desktop
    }
  },
  methods: {
    openURL
  }
}
</script>

<style>
</style>
