/*!
 * Replace no-js on HTML with js
 */
document.documentElement.className = document.documentElement.className.replace(/(\s|^)no-js(\s|$)/, '$1' + 'js' + '$2');

/*!
 * Element.closest() polyfill
 * https://developer.mozilla.org/en-US/docs/Web/API/Element/closest#Polyfill
 */
if (!Element.prototype.closest) {
	if (!Element.prototype.matches) {
		Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
	}
	Element.prototype.closest = function (s) {
		var el = this;
		var ancestor = this;
		if (!document.documentElement.contains(el)) return null;
		do {
			if (ancestor.matches(s)) return ancestor;
			ancestor = ancestor.parentElement;
		} while (ancestor !== null);
		return null;
	};
}

// IE-safe forEach method
var forEach = function(array, callback, scope){
  for (var i = 0; i < array.length; i++){
    callback.call(scope, i, array[i]);
  }
};

/*!
 * General Helpers
 */
document.addEventListener('DOMContentLoaded', function(){
  // Table overflow
  forEach(document.querySelectorAll('table'), function(index, item) {
    table = item;
    var table_wrapper = document.createElement('div');
    table_wrapper.className = 'tablewrap';
    table.parentNode.insertBefore(table_wrapper, table);
    table_wrapper.appendChild(table);
  });

}, false);

/*!
 * Fixed Navs
 * @author Erik Runyon, Shawn Maust
 * Updated 2020-02-04
 */
(function(){
  var scrollCurr = 0;
  var hasNavTop = (!!document.querySelector('#nav-top'));
  var hasNavFooter = (!!document.querySelector('#nav-footer'));
  var navMobile = document.querySelector('.nav-mobile-util');
  var navMobileHeight = navMobile.offsetHeight;
  var navMobileOffset = navMobile.offsetTop;
  var isMobile = function () { return (window.innerWidth < 960); }

  if (hasNavTop) {
    var navPrimary = document.querySelector('.nav-header');
    var navFixed = document.querySelector('#navbar');
    if (!navFixed) {
      navFixed = document.createElement('nav');
      navFixed.id = 'navbar';
      navFixed.className = 'navbar nav-top';
      navFixed.setAttribute('role', 'navigation');
      document.body.appendChild(navFixed);
    }
    var navPrimaryBot = navPrimary.offsetHeight + navPrimary.offsetTop;
    var topNavHtml = document.querySelector('#nav-top').innerHTML
                      .replace(/id="primary(_\d+)?"/gi, '')
                      .replace(/id="([\w-]+)?-nav-top"/gi, 'id="$1-navbar"');
    navFixed.innerHTML = topNavHtml;
  }

  if (hasNavFooter) {
    var windowBottom = window.pageYOffset + window.innerHeight;
    var navFooter = document.querySelector('.nav-footer');
    var siteFooter = document.querySelector('.site-footer');
    var footerTop = siteFooter.offsetTop + navFooter.offsetHeight;
  }

  var scrollHandler = function () {
    scrollCurr = window.pageYOffset;

    // Mobile Sticky Nav
    if (isMobile()) {
      if (scrollCurr > navMobileOffset){
        document.body.style.marginTop = navMobileHeight + 'px';
        navMobile.classList.add('fixed');
      } else {
        navMobile.classList.remove('fixed');
        document.body.style.marginTop = 0;
      }
      return;
    }

    // Top Nav
    if (hasNavTop) {
      if (scrollCurr > navPrimaryBot) {
        navFixed.classList.add('visible');
      } else {
        navFixed.classList.remove('visible');
      }
    }

    // Footer Nav
    if (hasNavFooter) {
      windowBottom = scrollCurr + window.innerHeight;
      footerTop = siteFooter.offsetTop + navFooter.offsetHeight;
      if (windowBottom < footerTop) {
        navFooter.classList.add('fixed');
      } else {
        navFooter.classList.remove('fixed');
      }
    }
  }

  var resizeHandler = function () {
    document.body.style.marginTop = 0;
    navMobile.classList.remove('fixed');
    if (isMobile()) {
      navMobileHeight = navMobile.offsetHeight;
      navMobileOffset = navMobile.offsetTop;
      if (hasNavFooter) navFooter.classList.remove('fixed');
    } else {
      if (hasNavTop) navPrimaryBot = navPrimary.offsetHeight + navPrimary.offsetTop;
    }
    scrollHandler();
  }

  document.addEventListener("DOMContentLoaded", resizeHandler); // Load
  window.addEventListener('resize', resizeHandler); // Resize
  window.addEventListener('scroll', scrollHandler);
})();
