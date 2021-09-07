<template>
  <div class="full-width">
    <svg aria-hidden="true" style="position: absolute; width: 0; height: 0;" width="0" height="0" version="1.1" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <symbol id="icon-nd-monogram" viewBox="0 0 1024 1024">
          <path d="M835.838 917.917v-0.109c0-11.076 8.992-20.364 20.427-20.364 11.419 0 20.302 9.179 20.302 20.255v0.109c0 11.076-9.008 20.364-20.427 20.364-11.404 0.015-20.302-9.163-20.302-20.255zM871.914 917.824v-0.093c0-8.696-6.736-15.712-15.666-15.712-8.976 0-15.744 7.125-15.744 15.806v0.093c0 8.696 6.721 15.712 15.651 15.712 8.976 0 15.759-7.125 15.759-15.806zM847.816 906.405h9.63c2.925 0 5.181 0.84 6.705 2.365 1.167 1.182 1.79 2.816 1.79 4.73v0.109c0 3.485-1.898 5.678-4.668 6.69l5.29 7.763h-5.57l-4.62-6.97h-3.765v6.97h-4.791v-21.655zM857.384 916.968c2.427 0 3.718-1.291 3.718-3.096v-0.109c0-2.085-1.462-3.143-3.827-3.143h-4.668v6.363h4.776z"></path>
          <path d="M898.47 265.59h-103.361v-60.766h74.441v-118.981h-268.050v118.981h74.643v60.766h-192.395l-92.502-179.748h-181.458v118.981h74.643v60.766h-247.608v118.981h53.983v254.951h-53.983v118.981h247.608v60.766h-74.643v118.981h267.863v-118.981h-74.238v-60.766h192.457l92.502 179.748h106.753v-179.748h103.361l90.262-90.262v-312.699l-90.279-89.951zM869.566 618.971l-20.349 20.551h-54.093v-254.951h54.388l20.053 20.255v214.144zM676.144 384.572v254.951l-131.163-254.951h131.163zM209.787 639.522v-254.951h74.643v254.951h-74.643zM403.411 639.522v-254.951l131.224 254.951h-131.224z"></path>
        </symbol>
        <symbol id="icon-envelope-o" viewBox="0 0 512 512">
          <path d="M464 64H48C21.49 64 0 85.49 0 112v288c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V112c0-26.51-21.49-48-48-48zm0 48v40.805c-22.422 18.259-58.168 46.651-134.587 106.49-16.841 13.247-50.201 45.072-73.413 44.701-23.208.375-56.579-31.459-73.413-44.701C106.18 199.465 70.425 171.067 48 152.805V112h416zM48 400V214.398c22.914 18.251 55.409 43.862 104.938 82.646 21.857 17.205 60.134 55.186 103.062 54.955 42.717.231 80.509-37.199 103.053-54.947 49.528-38.783 82.032-64.401 104.947-82.653V400H48z"></path>
        </symbol>
        <symbol id="icon-home" viewBox="0 0 576 512">
          <path d="M488 312.7V456c0 13.3-10.7 24-24 24H348c-6.6 0-12-5.4-12-12V356c0-6.6-5.4-12-12-12h-72c-6.6 0-12 5.4-12 12v112c0 6.6-5.4 12-12 12H112c-13.3 0-24-10.7-24-24V312.7c0-3.6 1.6-7 4.4-9.3l188-154.8c4.4-3.6 10.8-3.6 15.3 0l188 154.8c2.7 2.3 4.3 5.7 4.3 9.3zm83.6-60.9L488 182.9V44.4c0-6.6-5.4-12-12-12h-56c-6.6 0-12 5.4-12 12V117l-89.5-73.7c-17.7-14.6-43.3-14.6-61 0L4.4 251.8c-5.1 4.2-5.8 11.8-1.6 16.9l25.5 31c4.2 5.1 11.8 5.8 16.9 1.6l235.2-193.7c4.4-3.6 10.8-3.6 15.3 0l235.2 193.7c5.1 4.2 12.7 3.5 16.9-1.6l25.5-31c4.2-5.2 3.4-12.7-1.7-16.9z"></path>
        </symbol>
        <symbol id="icon-linkedin" viewBox="0 0 448 512">
          <path d="M100.3 480H7.4V180.9h92.9V480zM53.8 140.1C24.1 140.1 0 115.5 0 85.8 0 56.1 24.1 32 53.8 32c29.7 0 53.8 24.1 53.8 53.8 0 29.7-24.1 54.3-53.8 54.3zM448 480h-92.7V334.4c0-34.7-.7-79.2-48.3-79.2-48.3 0-55.7 37.7-55.7 76.7V480h-92.8V180.9h89.1v40.8h1.3c12.4-23.5 42.7-48.3 87.9-48.3 94 0 111.3 61.9 111.3 142.3V480z"></path>
        </symbol>
        <symbol id="icon-twitter" viewBox="0 0 512 512">
          <path d="M459.37 151.716c.325 4.548.325 9.097.325 13.645 0 138.72-105.583 298.558-298.558 298.558-59.452 0-114.68-17.219-161.137-47.106 8.447.974 16.568 1.299 25.34 1.299 49.055 0 94.213-16.568 130.274-44.832-46.132-.975-84.792-31.188-98.112-72.772 6.498.974 12.995 1.624 19.818 1.624 9.421 0 18.843-1.3 27.614-3.573-48.081-9.747-84.143-51.98-84.143-102.985v-1.299c13.969 7.797 30.214 12.67 47.431 13.319-28.264-18.843-46.781-51.005-46.781-87.391 0-19.492 5.197-37.36 14.294-52.954 51.655 63.675 129.3 105.258 216.365 109.807-1.624-7.797-2.599-15.918-2.599-24.04 0-57.828 46.782-104.934 104.934-104.934 30.213 0 57.502 12.67 76.67 33.137 23.715-4.548 46.456-13.32 66.599-25.34-7.798 24.366-24.366 44.833-46.132 57.827 21.117-2.273 41.584-8.122 60.426-16.243-14.292 20.791-32.161 39.308-52.628 54.253z"></path>
        </symbol>
        <symbol id="icon-facebook" viewBox="0 0 448 512">
          <path d="M448 56.7v398.5c0 13.7-11.1 24.7-24.7 24.7H309.1V306.5h58.2l8.7-67.6h-67v-43.2c0-19.6 5.4-32.9 33.5-32.9h35.8v-60.5c-6.2-.8-27.4-2.7-52.2-2.7-51.6 0-87 31.5-87 89.4v49.9h-58.4v67.6h58.4V480H24.7C11.1 480 0 468.9 0 455.3V56.7C0 43.1 11.1 32 24.7 32h398.5c13.7 0 24.8 11.1 24.8 24.7z"></path>
        </symbol>
        <symbol id="icon-google" viewBox="0 0 448 512">
          <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
        </symbol>
        <symbol id="icon-youtube" viewBox="0 0 576 512">
          <path d="M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.5 48.284 47.821C117.22 448 288 448 288 448s170.78 0 213.371-11.486c23.497-6.321 42.003-24.171 48.284-47.821 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305zm-317.51 213.508V175.185l142.739 81.205-142.739 81.201z"></path>
        </symbol>
        <symbol id="icon-instagram" viewBox="0 0 448 512">
          <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"></path>
        </symbol>
        <symbol id="icon-chevron-left" viewBox="0 0 320 512">
          <path d="M34.52 239.03L228.87 44.69c9.37-9.37 24.57-9.37 33.94 0l22.67 22.67c9.36 9.36 9.37 24.52.04 33.9L131.49 256l154.02 154.75c9.34 9.38 9.32 24.54-.04 33.9l-22.67 22.67c-9.37 9.37-24.57 9.37-33.94 0L34.52 272.97c-9.37-9.37-9.37-24.57 0-33.94z"></path>
        </symbol>
        <symbol id="icon-chevron-right" viewBox="0 0 320 512">
          <path d="M285.476 272.971L91.132 467.314c-9.373 9.373-24.569 9.373-33.941 0l-22.667-22.667c-9.357-9.357-9.375-24.522-.04-33.901L188.505 256 34.484 101.255c-9.335-9.379-9.317-24.544.04-33.901l22.667-22.667c9.373-9.373 24.569-9.373 33.941 0L285.475 239.03c9.373 9.372 9.373 24.568.001 33.941z"></path>
        </symbol>
        <symbol id="icon-chevron-up" viewBox="0 0 448 512">
          <path d="M240.971 130.524l194.343 194.343c9.373 9.373 9.373 24.569 0 33.941l-22.667 22.667c-9.357 9.357-24.522 9.375-33.901.04L224 227.495 69.255 381.516c-9.379 9.335-24.544 9.317-33.901-.04l-22.667-22.667c-9.373-9.373-9.373-24.569 0-33.941L207.03 130.525c9.372-9.373 24.568-9.373 33.941-.001z"></path>
        </symbol>
        <symbol id="icon-chevron-down" viewBox="0 0 448 512">
          <path d="M207.029 381.476L12.686 187.132c-9.373-9.373-9.373-24.569 0-33.941l22.667-22.667c9.357-9.357 24.522-9.375 33.901-.04L224 284.505l154.745-154.021c9.379-9.335 24.544-9.317 33.901.04l22.667 22.667c9.373 9.373 9.373 24.569 0 33.941L240.971 381.476c-9.373 9.372-24.569 9.372-33.942 0z"></path>
        </symbol>
        <symbol id="icon-user" viewBox="0 0 448 512">
          <path d="M355.165 226.983l-11.257-3.216C353.3 209.665 368 182.136 368 144 368 64.519 303.584 0 224 0 144.519 0 80 64.416 80 144c0 38.131 14.696 65.659 24.093 79.767l-11.257 3.216C56.355 237.407 0 276.069 0 350.058v88.799C0 479.188 32.812 512 73.143 512h301.714C415.188 512 448 479.188 448 438.857v-88.799c0-73.384-55.581-112.43-92.835-123.075zM224 48c53.019 0 96 42.981 96 96s-42.981 96-96 96-96-42.981-96-96 42.981-96 96-96zm176 390.857C400 452.743 388.743 464 374.857 464H73.143C59.257 464 48 452.743 48 438.857v-88.799c0-35.719 23.678-67.109 58.022-76.922l36.46-10.417C165.929 278.843 194.106 288 224 288c29.852 0 58.036-9.133 81.518-25.281l36.46 10.417C376.322 282.949 400 314.34 400 350.058v88.799z"></path>
        </symbol>
      </defs>
    </svg>
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
              <p class="text-center buttons">
                <q-btn
                  type="a"
                  :href="`mailto:${email}`"
                  color="secondary"
                  size="lg"
                  label="EXPLORE PARTNERSHIP" />&nbsp;
                <q-btn
                  type="a"
                  href="/login"
                  color="primary"
                  size="lg"
                  label="LOGIN" />
              </p>
            </div>
          </div>
          <p class="page-image full">
            <img src="/statics/placeholder-graph-800x450.avif" :alt="hero.alt" width="800" height="400"
              srcset="/statics/placeholder-graph-800x450.avif 800w,
                      /statics/placeholder-graph-1200x675.avif 1200w,
                      /statics/placeholder-graph-1600x900.avif 1600w,
                      /statics/placeholder-graph-1920x1080.avif 1920w"
              sizes="100vw">
          </p>

        </div>

        <main class="page-main block-center" role="main">
          <h1 class="page-title">{{ title }}</h1>
          <div class="page-lede">
            <p>{{ description }}</p>
            <p class="text-center buttons">
              <q-btn
                type="a"
                :href="`mailto:${email}`"
                color="secondary"
                size="lg"
                label="EXPLORE PARTNERSHIP" />&nbsp;
              <q-btn
                type="a"
                href="/login"
                color="primary"
                size="lg"
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
main {
  font-size: 1.45rem;
}
/* latin */
@font-face {
  font-family: 'Libre Franklin';
  font-style: normal;
  font-weight: 400;
  src: url(https://fonts.gstatic.com/s/librefranklin/v7/jizDREVItHgc8qDIbSTKq4XkRiUf2zc.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
/* latin */
@font-face {
  font-family: 'Libre Franklin';
  font-style: normal;
  font-weight: 700;
  src: url(https://fonts.gstatic.com/s/librefranklin/v7/jizDREVItHgc8qDIbSTKq4XkRiUf2zc.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
  font-display: swap;
}
/* latin */
@font-face {
  font-family: 'Sumana';
  font-style: normal;
  font-weight: 400;
  src: url(https://fonts.gstatic.com/s/sumana/v5/4UaDrE5TqRBjGj-29xLj.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
  font-display: swap;
}
</style>

<script>
import { date } from 'quasar'

export default {
  data () {
    return {
      siteName: `PACE`,
      title: `Publication Activity Collection Environment`,
      description: `
        Providing high-confidence publication data for centers,
        institutes, and departments to measure impact and highlight
        examples of research excellence.`,
      address: {
        street1: '271C Hesburgh Library',
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
        alt: `
          Network visualizatin of publication and funding activity 
          at the University of Notre Dame's Harper Cancer Reach 
          Institute.`
      },
      cdnPrefix: 'https://cdn.jsdelivr.net/gh/share-research/pace-admin@new_home_ui/client/src/statics/'
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
      title: 'PACE - Publication Activity Collection Environment',
      // optional; sets final title as "Index Page - My Website", useful for multiple level meta
      // titleTemplate: title => `${this.siteName}`,

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
        }
      },

      // JS tags
      script: {
        '1-ndt': {
          src: '/statics/ndweb/javascripts/ndt.js'
        }
      },

      // <html> attributes
      htmlAttr: {
      },

      // <body> attributes
      bodyAttr: {
        'voacab': 'https://schema.org/',
        'class': 'bg-cube-texture nav-top-true full-width'
      }
    }
  }
}
</script>
