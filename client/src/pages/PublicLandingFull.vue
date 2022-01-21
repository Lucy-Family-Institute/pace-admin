<template>
  <div>
    <!-- Skip links -->
    <nav class="skip-links" aria-label="Skip links">
      <ul>
        <li><a href="#content" accesskey="C" title="Skip to content = C">Skip To Content</a></li>
        <li><a href="#nav-top" accesskey="S" title="Skip to navigation = S">Skip To Navigation</a></li>
      </ul>
    </nav>
    <div class="wrapper" id="wrapper">
      <!-- Site Header -->
      <header id="header" class="site-header">
        <p class="mark-header"><a href="https://www.nd.edu/">University of Notre Dame</a></p>
        <div class="site-title-group">
          <p id="site-title" class="site-title"><a href="/" accesskey="1" title="Homepage shortcut key = 1">{{ siteName }}</a></p>
        </div>
        <!-- Header Search/Nav  -->
        <div class="nav-header">
          <nav id="nav-top" class="nav-top" role="navigation" aria-label="Primary navigation">
            <div id="primary">
              <ul>
                <li>
                  <a class="active" href="/" aria-label="Home">
                    <!-- <q-icon class="icon" name="home" width="16" height="16" /> -->
                    <svg class="icon" width="16" height="16">
                      <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#icon-home"></use>
                    </svg>
                  </a>
                </li>
                <li>
                  <a href="/login">
                    Login
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>
        <!-- Mobile Navbar -->
        <div class="nav-mobile-util">
          <ul class="no-bullets">
            <li>
              <a href="/">
                <svg class="icon" width="16" height="16">
                  <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#icon-home"></use>
                </svg>&nbsp;Home
              </a>
            </li>
            <li>
              <a href="/login" :class="{ hidden: false }">
                <svg class="icon" width="16" height="16">
                  <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#icon-user"></use>
                </svg>&nbsp;Login
              </a>
            </li>
            <li>
            </li>
          </ul>
        </div>
      </header>
      <!-- Site Content -->
      <div id="content" class="site-content">
        <div class="page-header has-title has-image">
          <div class="page-title-wrapper" aria-hidden="true">
            <p class="page-title">{{ title }}</p>
            <div class="page-lede">
              <p>{{ description }}</p>
              <p class="text-center btn-group">
                <q-btn
                  type="a"
                  href="/login"
                  size="md"
                  label="LOGIN"
                  class="btn btn-cta" />
              </p>
            </div>
          </div>
          <p class="page-image full">
            <img src="/statics/placeholder-graph-800x450.jpg" :alt="hero.alt" width="800" height="400"
              srcset="/statics/placeholder-graph-800x450.jpg 800w,
                      /statics/placeholder-graph-1200x675.jpg 1200w,
                      /statics/placeholder-graph-1600x900.jpg 1600w,
                      /statics/placeholder-graph-1920x1080.jpg 1920w"
              sizes="100vw">
          </p>

        </div>

        <main class="page-main block-center" role="main">
          <h1 class="page-title">{{ title }}</h1>
          <div class="page-lede">
            <p>{{ description }}</p>
            <p class="text-center btn-group">
              <q-btn
                type="a"
                :href="`mailto:${email}`"
                size="md"
                class="btn btn-cta"
                label="EXPLORE PARTNERSHIP" />&nbsp;
              <q-btn
                type="a"
                href="/login"
                class="btn btn-cta"
                size="md"
                label="LOGIN" />
            </p>
          </div>
          <p v-html="intro"></p>
        </main>
      </div>

      <!-- Site Footer -->
      <footer id="footer" class="site-footer" role="contentinfo">
        <div class="footer-org" typeof="Organization" resource="#siteorg">
          <meta property="parentOrganization" resource="#parentorg" content="University of Notre Dame">
          <!-- Organizational Breadcrumbs -->
          <ul class="footer-breadcrumbs">
            <li><a :href="hesburghUrl">Hesburgh Libraries</a></li>
            <li><a :href="labUrl">Stragegic Innovation Lab</a></li>
          </ul>
          <p><a href="/" class="site-link" property="url"><span property="name">{{ siteName }}</span></a></p>
          <div class="footer-contacts">
            <p class="contact-info">
              <span class="address" property="address" typeof="PostalAddress">
                <span property="streetAddress">{{ address.street1 }}</span><br>
                <span property="addressLocality">{{ address.city }}</span>,
                <span property="addressRegion">{{ address.state }}</span>&nbsp;
                <span property="postalCode">{{ address.zip }}</span>&nbsp;
                <span property="addressCountry">{{ address.country }}</span>
              </span>
              <span class="footer-phone" property="telephone" :content="`+1 ${phone}`">Phone <a :href="`tel:${phoneNoSpaces}`">{{ phone }}</a></span>
              <span class="footer-email" property="email"><a :href="`mailto:${email}`">{{ email }}</a></span>
            </p>
            <nav class="social" aria-label="Social media navigation" vocab="">
              <ul>
                <!-- Site-specific Social Media -->
                <li><a class="soc-facebook" :href="social.facebookUrl" rel="noopener" :aria-label="`${siteName} on Facebook`"><svg class="icon" width="16" height="16" aria-hidden="true"> <use xlink:href="#icon-facebook"></use> </svg> Facebook</a></li>
                <li><a class="soc-twitter" :href="social.twitterUrl" rel="noopener" :aria-label="`${siteName} on Twitter`"><svg class="icon" width="16" height="16" aria-hidden="true"> <use xlink:href="#icon-twitter"></use> </svg> Twitter</a></li>
                <li><a class="soc-instagram" :href="social.instagramUrl" rel="noopener" :aria-label="`${siteName} on Instagram`"><svg class="icon" width="16" height="16" aria-hidden="true"> <use xlink:href="#icon-instagram"></use> </svg> Instagram</a></li>
              </ul>
            </nav>
          </div>
          <div property="logo" typeof="ImageObject">
            <meta property="url" content="https://static.nd.edu/images/webclips/default/webclip-60.png">
          </div>
          <p class="copyright"><a href="https://www.nd.edu/copyright/">&copy; {{ copyright.startYear }}-{{ copyright.currentYear }}</a>&nbsp;<a :href="copyright.url">{{ copyright.holderName }}</a></p>
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
  </div>
</template>

<style scoped>
@import '../statics/edu.nd/conductor.nd.edu/stylesheets/themes/ndt/v3/ndt.css';

@media only screen and (min-width: 60em) {
  .page-title-wrapper {
      grid-column: 3/4;
  }
}
</style>

<script>
import { date } from 'quasar'

export default {
  data () {
    return {
      siteName: 'PACE',
      title: 'Publication Activity Collection Environment',
      description: `A pilot project in partnership between the Hesburgh Libraries and Notre Dame Research
        to collect publication data for centers,
        institutes, and departments to measure impact and highlight
        examples of research excellence.`,
      address: {
        street1: '271A Hesburgh Library',
        city: 'Notre Dame',
        state: 'IN',
        zip: 46556,
        country: 'USA'
      },
      phone: '(574) 631-1086',
      email: 'rjohns14@nd.edu',
      hesburghUrl: 'https://library.nd.edu/',
      labUrl: 'https://directory.library.nd.edu/directory/departments/1194',
      ndResearchUrl: 'https://research.nd.edu/',
      '221BUrl': 'https://221b.io',
      social: {
        facebookUrl: '#',
        twitterUrl: '#',
        instagramUrl: '#'
      },
      copyright: {
        startYear: 2019,
        currentYear: date.formatDate(Date.now(), 'YYYY'),
        holderName: 'University of Notre Dame',
        holderUrl: 'https://www.nd.edu'
      },
      hero: {
        imageUrl: '/statics/graph16x9wVig.jpg',
        alt: `
          Network visualizatin of publication and funding activity 
          at the University of Notre Dame's Harper Cancer Reach 
          Institute.`
      }
    }
  },
  computed: {
    phoneNoSpaces () {
      return this.phone.replace(' ', '')
    },
    intro () {
      return `
        PACE is being developed and run by the
        <a href="${this.hesburghUrl}">Hesburgh Libraries</a>' <a href="${this.labUrl}">Strategic Innvotation Lab</a>
        in partnership with <a href="${this.ndResearchUrl}">ND Research</a>
        and <a href="${this['221BUrl']}">221B Consulting</a>
        with the goal of reducing the traditionally time-consuming and
        error-prone process of collecting and cleaning faculty publication data.
      `
    }
  },
  mounted () {
    const resizeHandler = function () {
    }
    window.removeEventListener('resize', resizeHandler)
  },
  meta () {
    return {
      // sets document title
      title: 'Landing Page',
      // optional; sets final title as "Index Page - My Website", useful for multiple level meta
      titleTemplate: title => `${this.siteName}`,

      // meta tags
      meta: {
        charset: { charset: 'utf-8' },
        viewport: {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, shrink-to-fit=no'
        },
        theme: {
          name: 'theme-color',
          content: '#002b5c'
        }
      },

      // CSS tags
      link: {
        webclip76: {
          rel: 'apple-touch-icon',
          sizes: '76x76',
          href: 'https://static.nd.edu/images/webclips/default/webclip-76.png'
        },
        monogram16: {
          rel: 'icon',
          sizes: '16x16',
          href: 'https://static.nd.edu/images/monogram/gold/monogram-16.png'
        },
        hero: {
          rel: 'preload',
          as: 'image',
          href: '/statics/graph16x9wVig.jpg'
        }
      },

      // JS tags
      script: {
        '1-ndt': {
          src: '/statics/ndweb/javascripts/ndt.js'
        },
        '2-local': {
          src: '/statics/ndweb/javascripts/site.js'
        }
      },

      // <html> attributes
      htmlAttr: {
        lang: 'en',
        class: 'no-js'
      },

      // <body> attributes
      bodyAttr: {
        'voacab': 'https://schema.org/',
        'class': 'nav-top-true full-width'
      }
    }
  }
}
</script>
