<template>
  <q-layout view="lHh lpr fFf">
        <!-- Skip links -->
  <nav class="skip-links" aria-label="Skip links">
    <ul>
      <li><a href="#content" accesskey="C" title="Skip to content = C">Skip To Content</a></li>
      <li><a href="#nav-top" accesskey="S" title="Skip to navigation = S">Skip To Navigation</a></li>
    </ul>
  </nav>
    <q-header elevated>
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
    <div id="primary" style="background-color:#fff">
      <q-tabs align="justify">
          <q-route-tab name="/"
            icon="home"
            style="font-size: 10rem;"
            to="/"
            exact
          />
          <q-route-tab name="person"
            v-if="isLoggedIn"
            icon="group"
            to="/"
            exact
          />
          <q-route-tab name="center"
            v-if="isLoggedIn"
            icon="account_balance"
            to="/center_review"
            exact
          />
          <q-route-tab name="dashboard"
            icon="poll"
            style="font-size: 10rem;"
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
            v-if="isLoggedIn"
          />
          <q-btn
            dense
            flat
            label="Login"
            type="a" href="/login"
            v-else
          />
        </q-btn-group>
          </q-tab>
        </q-tabs>
      </div>
    </q-header>

    <q-page-container>
          <div class="wrapper" id="wrapper">

      <router-view v-if="isLoggedIn" />
    <!-- Site Content -->
    <!-- <div id="content" class="site-content"> -->
       <!-- Site Footer -->
    <footer id="footer" class="site-footer" role="contentinfo">
      <div class="footer-org" typeof="Organization" resource="#siteorg">
        <meta property="parentOrganization" resource="#parentorg" content="University of Notre Dame">
        <!-- Organizational Breadcrumbs -->
        <ul class="footer-breadcrumbs">
          <li><a href="#">Hesburgh Libraries</a></li>
        </ul>
        <p><a href="/" class="site-link" property="url"><span property="name">PACE</span></a></p>
        <div class="footer-contacts">
          <p class="contact-info">
            <span class="address" property="address" typeof="PostalAddress">
              <span property="streetAddress">284 Hesburgh Library</span><br>
              <span property="addressLocality">Notre Dame</span>, <span property="addressRegion"> IN</span> <span property="postalCode"> 46556</span> <span property="addressCountry"> USA</span>
            </span>
            <span class="footer-phone" property="telephone" content="+1 (574) 631-6679">Phone <a href="tel:(574)631-6679">(574) 631-6679</a></span>
            <span class="footer-email" property="email"><a href="mailto:strategic-innovation-lib-list@nd.edu">strategic-innovation-lib-list@nd.edu</a></span>
          </p>
          <nav class="social" aria-label="Social media navigation" vocab="">
            <ul>
              <!-- Site-specific Social Media -->
              <li><a class="soc-facebook" href="https://www.facebook.com/NDLibraries/" rel="noopener" aria-label="NDLibraries"><svg class="icon" width="16" height="16" aria-hidden="true"> <use xlink:href="#icon-facebook"></use> </svg> Facebook</a></li>
              <li><a class="soc-twitter" href="https://twitter.com/ndlibraries" rel="noopener" aria-label="NDLibraries"><svg class="icon" width="16" height="16" aria-hidden="true"> <use xlink:href="#icon-twitter"></use> </svg> Twitter</a></li>
              <!--<li><a class="soc-instagram" href="#" rel="noopener" aria-label="Site Name on Instagram"><svg class="icon" width="16" height="16" aria-hidden="true"> <use xlink:href="#icon-instagram"></use> </svg> Instagram</a></li>-->
            </ul>
          </nav>
        </div>
        <div property="logo" typeof="ImageObject">
          <meta property="url" content="https://static.nd.edu/images/webclips/default/webclip-60.png">
        </div>
        <p class="copyright"><a href="https://www.nd.edu/copyright/">&copy; 2021 </a> <a href="https://www.nd.edu">University of Notre Dame</a></p>
      </div>
      <div class="footer-parent" property="parentOrganization" typeof="CollegeOrUniversity" resource="#parentorg">
        <meta property="name" content="University of Notre Dame">
        <a href="https://www.nd.edu/" class="mark-footer" property="url logo" typeof="ImageObject" aria-label="University of Notre Dame">
          <img src="https://static.nd.edu/images/marks/gray/ndmark.svg" width="250" height="60" alt="University of Notre Dame" property="url">
        </a>
        <div class="footer-parent-links">
          <nav aria-label="Footer links navigation">
            <ul class="footer-links">
              <!-- Global Links -->
              <li><a href="https://search.nd.edu/" aria-label="Search Notre Dame">Search</a></li>
              <li><a href="https://mobile.nd.edu/" aria-label="Notre Dame Mobile App">Mobile App</a></li>
              <li><a href="https://news.nd.edu/" aria-label="Notre Dame News">News</a></li>
              <li><a href="https://events.nd.edu/" aria-label="Notre Dame Events">Events</a></li>
              <li><a href="https://www.nd.edu/visit/" aria-label="Visit Notre Dame">Visit</a></li>
              <li><a href="https://www.nd.edu/about/accessibility/" aria-label="Notre Dame Accessibility Information">Accessibility</a></li>
            </ul>
          </nav>
          <nav class="social" aria-label="Social media navigation" vocab="">
            <ul>
              <!-- Global Social Media -->
              <li><a class="soc-facebook" href="https://www.facebook.com/notredame/" rel="noopener" aria-label="Notre Dame on Facebook"><svg class="icon" width="16" height="16" aria-hidden="true"> <use xlink:href="#icon-facebook"></use> </svg> Facebook</a></li>
              <li><a class="soc-twitter" href="https://twitter.com/NotreDame/" rel="noopener" aria-label="Notre Dame on Twitter"><svg class="icon" width="16" height="16" aria-hidden="true"> <use xlink:href="#icon-twitter"></use> </svg> Twitter</a></li>
              <li><a class="soc-instagram" href="https://www.instagram.com/notredame/" rel="noopener" aria-label="Notre Dame on Instagram"><svg class="icon" width="16" height="16" aria-hidden="true"> <use xlink:href="#icon-instagram"></use> </svg> Instagram</a></li>
              <li><a class="soc-youtube" href="https://www.youtube.com/user/NDdotEDU" rel="noopener" aria-label="Notre Dame on YouTube"><svg class="icon" width="16" height="16" aria-hidden="true"> <use xlink:href="#icon-youtube"></use> </svg> YouTube</a></li>
              <li><a class="soc-linkedin" href="https://www.linkedin.com/school/university-of-notre-dame/" rel="noopener" aria-label="Notre Dame on LinkedIn"><svg class="icon" width="16" height="16" aria-hidden="true"> <use xlink:href="#icon-linkedin"></use> </svg> LinkedIn</a></li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  </div><!-- .wrapper -->
    </q-page-container>
  </q-layout>
</template>

<script>
import { openURL } from 'quasar'
import { sync } from 'vuex-pathify'
import _ from 'lodash'
import axios from 'axios'

import readOrganizations from '../../../gql/readOrganizations.gql'

export default {
  name: 'MyLayout',
  data () {
    return {
      // selectedCenter: 'Harper Cancer Research Institute',
      // options: [{
      //   label: 'Harper Cancer Research Institute',
      //   value: 'HCRI'
      // }]
    }
  },
  async created () {
    await this.syncSessionAndStore()
  },
  watch: {
    $route: 'syncSessionAndStore'
  },
  computed: {
    isLoggedIn: sync('auth/isLoggedIn'),
    userId: sync('auth/userId'),
    centerOptions: sync('filter/centerOptions'),
    selectedCenter: sync('filter/selectedCenter'),
    preferredSelectedCenter: sync('filter/preferredSelectedCenter')
  },
  methods: {
    openURL,
    async openDashboard () {
      openURL(process.env.DASHBOARD_BASE_URL)
    },
    async syncSessionAndStore () {
      if (
        this.isLoggedIn === null ||
        (this.isLoggedIn === true && this.userId === null)
      ) {
        try {
          const response = await axios({ url: '/session', method: 'GET' })
          if (_.get(response.data, 'databaseId') !== undefined) {
            this.isLoggedIn = true
            this.userId = response.data.databaseId
          } else {
            this.isLoggedIn = false
            this.userId = null
          }
        } catch (error) { // TODO specify the error
          // this.isBackendDisconnected = true
        }
      } else if (this.isLoggedIn === false) {
        this.userId = null
      }

      if (this.isLoggedIn) {
        const results = await this.$apollo.query({
          query: readOrganizations
        })

        this.centerOptions = _.map(results.data.review_organization, (reviewOrg) => {
          return {
            label: reviewOrg.comment,
            value: reviewOrg.value
          }
        })
      }

      if (!this.selectedCenter) {
        this.selectedCenter = this.preferredSelectedCenter
      }
    }
  }
}
</script>

<style>
  .row {
    width: revert;
  }
  .white {
    color: white;
  }
</style>
