<template>
  <q-layout view="lHh lpr fFf">
    <q-header elevated>
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

        <q-btn stretch flat label="Review" />
        <q-btn stretch flat label="Logs" />
        <q-space />
        <q-toggle v-model="isBulkEditing" color="red" label="Bulk Edit" left-label />
        <q-btn-group unelevated spread>
          <q-separator class="gt-sm" vertical inset/>
          <q-btn
            dense
            flat
            class="text-weight-light text-grey-8"
          >
            <q-avatar  size="32px">
              <img src="https://cdn.quasar.dev/img/avatar1.jpg">
            </q-avatar>
            <q-menu>
              <q-list style="min-width: 200px">
              <q-item to="/settings" clickable v-close-popup>
                <q-item-section>
                  <q-item-label>
                    <q-icon name="settings" class="q-pr-sm"/>Account Settings
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-separator inset/>
              <q-item @click='logout' clickable v-close-popup>
                <q-item-section>
                  <q-item-label>
                    <q-icon name="lock" class="q-pr-sm"/>Logout
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
            </q-menu>
          </q-btn>
        </q-btn-group>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      bordered
      content-class="bg-grey-2"
      behavior="desktop"
    >
      <q-list>
        <!-- <q-item clickable to="/">
          <q-item-section avatar>
            <q-icon name="card_travel" />
          </q-item-section>
          <q-item-section>
            <q-item-label>All Work</q-item-label>
          </q-item-section>
        </q-item> -->
        <q-item-label header>Centers/Institutes</q-item-label>
        <q-item clickable to="/packages">
          <q-item-section avatar>
            <q-icon name="school" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Harper Cancer Research</q-item-label>
            <q-item-label caption></q-item-label>
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
      leftDrawerOpen: false // this.$q.platform.is.desktop
    }
  },
  computed: {
    isBulkEditing: {
      get () {
        return this.$store.getters['admin/isBulkEditing']
      },
      set (newValue) {
        this.$store.dispatch('admin/toggleBulkEditing')
      }
    }
  },
  methods: {
    openURL
  }
}
</script>

<style>
</style>
