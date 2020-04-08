<template>
  <q-layout view="lHh lpr fFf">
    <q-header elevated>
      <q-toolbar>
        <q-avatar  size="32px">
          <img src="~/assets/nd-logo.png">
        </q-avatar>
        <q-toolbar-title shrink>
          PACE
        </q-toolbar-title>
        <q-separator vertical inset/>

        <q-space/>
        <q-select
          v-model="model"
          :options="options"
          class="white"
        />

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
              <q-item clickable v-close-popup>
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
      model: 'Harper Cancer Research Institute',
      options: [ 'Harper Cancer Research Institute' ]
    }
  },
  computed: {
  },
  methods: {
    openURL
  }
}
</script>

<style>
  .white {
    color: white;
  }
</style>
