<template>
  <q-header>
    <q-toolbar>
      <q-btn
        flat
        no-wrap
        stretch
        :to="{ name: 'home' }"
      >
        <q-toolbar-title>PACE</q-toolbar-title>
      </q-btn>
      <q-space />
      <q-btn-group align="center" unelevated spread id="menu">
        <router-link
          :to="{ name: 'review' }"
          custom
          v-slot:default="props"
        >
          <q-btn icon="group" v-bind="buttonProps(props)" />
        </router-link>
        <router-link
          :to="{ name: 'center-review' }"
          custom
          v-slot:default="props"
        >
          <q-btn icon="account_balance" v-bind="buttonProps(props)" />
        </router-link>
        <router-link
          :to="{ name: 'dashboard' }"
          custom
          v-slot:default="props"
        >
          <q-btn icon="poll" v-bind="buttonProps(props)"/>
        </router-link>
      </q-btn-group>
      <q-space />
      <q-btn-group unelevated spread>
        <span class="mark-header" style="margin:16px 10px 5px; background-image: url(https://static.nd.edu/images/marks/gold-white/ndmark.svg); height: 40px; width: 170px;"></span>
      </q-btn-group>
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
              <q-item
                clickable
                tag="a"
                href="/logout"
                v-close-popup
              >
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
</template>

<style scoped>
.q-header {
  color: white;
  --brand-blue: #0c2340;
  --brand-gold: #ae9142;
  --brand-blue-dark: #081629;
  border-top: 5px solid var(--brand-gold);
  border-bottom: 5px solid var(--brand-blue-dark);
  background: var(--brand-blue);
}

.underlined {
  border-bottom: 2px solid white
}

#menu > .q-btn {
  margin-left: 15px;
  margin-right: 15px;
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
  },
  methods: {
    buttonProps ({ href, route, isActive, isExactActive }) {
      const props = {
        to: route
      }

      if (isActive === true) {
        props.class = 'underlined'
      }

      return props
    }
  }
}
</script>
