<template>
  <q-header elevated class="site-header">
    <q-toolbar>
      <q-btn
        flat
        no-wrap
        stretch
        to="/"
      >
        <q-toolbar-title>PACE</q-toolbar-title>
      </q-btn>
      <q-space />
      <q-btn-group unelevated spread v-if="!isLoggedIn">
        <q-btn
          stretch
          flat
          label="Login"
          @click="login"
        />
      </q-btn-group>
      <q-btn-group unelevated spread v-else>
        <q-btn
          dense
          flat
          class="text-weight-light text-grey-8"
        >
        <q-avatar color="secondary" text-color="white">{{ name[0] }}</q-avatar>
          <q-menu>
            <q-list style="min-width: 200px">
              <a href="/logout">
                <q-item clickable v-close-popup>
                  <q-item-section>
                    <q-item-label>
                      <q-icon name="lock" class="q-pr-sm"/>Logout
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </a>
            </q-list>
          </q-menu>
        </q-btn>
      </q-btn-group>
    </q-toolbar>
  </q-header>
</template>

<style scoped>
.site-header {
  color: white;
  --brand-blue: #0c2340;
  --brand-gold: #ae9142;
  --brand-blue-dark: #081629;
  border-top: 5px solid var(--brand-gold);
  background: var(--brand-blue);
  border-bottom: 5px solid var(--brand-blue-dark);
}
</style>

<script>
import { get } from 'vuex-pathify'
export default {
  data () {
    return {
    }
  },
  computed: {
    isLoggedIn: get('auth/isLoggedIn'),
    name: get('auth/name')
  }
}
</script>
