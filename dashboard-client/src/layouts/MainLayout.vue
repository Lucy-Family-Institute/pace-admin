<template>
  <q-layout view="lHh Lpr lFf">
    <q-header unelevated style="border-bottom:1px solid #a4b7c1" >
      <q-toolbar>
        <q-toolbar-title>
          <img src='~/assets/logo.png' class="vertical-middle" />
        </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
export default {
  name: 'MainLayout',

  components: {
  },

  data () {
    return {
      leftDrawerOpen: false
    }
  }
}
</script>
