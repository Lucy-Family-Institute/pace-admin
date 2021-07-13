<template>
  <div>
    <div class="wrapper" id="wrapper">
      <header id="header" class="site-header">
        <p class="mark-header"><a href="https://www.nd.edu/">University of Notre Dame</a></p>
        <div class="site-title-group">
          <p id="site-title" class="site-title"><a href="/" accesskey="1" title="Homepage shortcut key = 1">PACE</a></p>
        </div>
        <!-- Header Search/Nav  -->
        <!-- Mobile Navbar -->
        <div class="nav-mobile-util" align="right">
        </div>
      </header>
    </div>
    <div style="background-color:#fff">
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
          to="/"
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
  </div>
</template>
