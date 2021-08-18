<template>
  <q-header>
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
      <q-btn-group unelevated spread>
      <p class="mark-header" style="margin:16px 10px 5px; background-image: url(https://static.nd.edu/images/marks/gold-white/ndmark.svg); height: 40px; width: 170px;"><a href="/"></a></p>
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
    <div>
      <q-tabs align="justify">
          <q-route-tab name="/"
            icon="home"
            style="font-size: 10rem;"
            class="tab"
            to="/"
            exact
          />
          <q-route-tab name="person"
            v-if="isLoggedIn"
            icon="group"
            to="/review"
            class="tab"
            exact
          />
          <q-route-tab name="center"
            v-if="isLoggedIn"
            icon="account_balance"
            to="/center_review"
            class="tab"
            exact
          />
          <q-route-tab name="dashboard"
            icon="poll"
            class="tab"
            to="/dashboard"
            exact
          />
          <q-tab>
          <q-btn-group unelevated spread>
          <q-separator class="gt-sm" vertical inset/>
          <q-btn
            dense
            flat
            label="Logout"
            type="a" href="/logout"
            class="tab"
            v-if="isLoggedIn"
          />
          <q-btn
            dense
            flat
            label="Login"
            class="tab"
            type="a" href="/login"
            v-else
          />
        </q-btn-group>
          </q-tab>
        </q-tabs>
      </div>
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
