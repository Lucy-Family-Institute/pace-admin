<template>
  <div>
    <div class="wrapper" id="wrapper">
      <header id="header" class="site-header">
        <p class="mark-header"><a href="https://www.nd.edu/">University of Notre Dame</a></p>
        <div class="site-title-group">
          <p id="site-title" class="site-title"><a href="/" accesskey="1" title="Homepage shortcut key = 1">PACE</a></p>
        </div>
        <div class="nav-header">
        <nav id="nav-top" class="nav-top" role="navigation" aria-label="Primary navigation">
          <div id="primary">
            <ul>
              <li><a class="active" href="/" aria-label="Home"><svg class="icon" width="16" height="16"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#icon-home"></use></svg></a></li>
              <li><a href="#">Page A</a></li>
              <li><a href="#">Page B</a></li>
              <li><a href="#">Page C</a></li>
              <li class="nav-search"><button class="btn-search search-toggle" aria-label="Toggle search"><svg class="icon" width="16" height="16"><use xlink:href="#icon-search"></use></svg></button></li>
            </ul>
            <div class="nav-search-wrapper">
              <form method="get" action="/search/" id="search-nav-top" class="search-form" role="search" aria-label="Site search">
                <input type="hidden" name="as_sitesearch" value="siteurl.nd.edu">
                <input type="hidden" name="entqr" value="3">
                <input type="search" name="q" class="search-input" id="search-input-nav-top" placeholder="Search this site" title="type your search term" aria-label="Site Search input">
                <button class="search-button" type="submit" aria-label="Search"><svg class="icon" width="16" height="16" data-icon="search"><use xlink:href="#icon-search"></use></svg></button>
                <button class="search-close search-toggle" aria-label="Close Search"><svg class="icon" width="16" height="16"><use xlink:href="#icon-close"></use></svg></button>
              </form>
            </div>
          </div>
        </nav>
      </div>
      </header>
    </div>
    <!-- <div style="background-color:#fff">
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
      </q-tabs> -->
    <!-- </div> -->
  </div>
</template>

<style scoped>
</style>

<script>
// import { defineComponent } from '@vue/composition-api'

export default {
  data () {
    return {
    }
  },
  async created () {
    var hasNavTop = (!!document.querySelector('#nav-top'))
    // var navMobile = document.querySelector('.nav-mobile-util')
    // var navMobileHeight = navMobile.offsetHeight
    // var navMobileOffset = navMobile.offsetTop
    // var isMobile = function () { return (window.innerWidth < 960) }

    if (hasNavTop) {
      // var navPrimary = document.querySelector('.nav-header')
      var navFixed = document.querySelector('#navbar')
      if (!navFixed) {
        navFixed = document.createElement('nav')
        navFixed.id = 'navbar'
        navFixed.className = 'navbar nav-top'
        navFixed.setAttribute('role', 'navigation')
        document.body.appendChild(navFixed)
      }
      var topNavHtml = document.querySelector('#nav-top').innerHTML
        .replace(/id="primary(_\d+)?"/gi, '')
        .replace(/id="([\w-]+)?-nav-top"/gi, 'id="$1-navbar"')
      navFixed.innerHTML = topNavHtml
    }
  },
  methods: {

  }
}
</script>
