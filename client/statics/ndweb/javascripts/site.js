/*!
 * Load ND icons
 */
!function(e,t){"use strict";if(!t.createElementNS||!t.createElementNS("http://www.w3.org/2000/svg","svg").createSVGRect)return!0;var n,a,s="localStorage"in e&&null!==e.localStorage,o=function(){t.body.insertAdjacentHTML("afterbegin",a)},i=function(){t.body?o():t.addEventListener("DOMContentLoaded",o)};if(s&&1==localStorage.getItem("inlineSVGrev")&&(a=localStorage.getItem("inlineSVGdata")))return i(),!0;try{(n=new XMLHttpRequest).open("GET","https://static.nd.edu/images/icons/base-v1.svg",!0),n.onload=function(){n.status>=200&&n.status<400&&(a=n.responseText,i(),s&&(localStorage.setItem("inlineSVGdata",a),localStorage.setItem("inlineSVGrev",1)))},n.send()}catch(e){}}(window,document);var icons=document.querySelectorAll("span.icon");for(i=0;i<icons.length;i++){var el=icons[i],className=el.getAttribute("class"),dataIcon=el.getAttribute("data-icon"),svg=document.createElementNS("http://www.w3.org/2000/svg","svg"),use=document.createElementNS("http://www.w3.org/2000/svg","use");use.setAttributeNS("http://www.w3.org/1999/xlink","xlink:href","#icon-"+dataIcon),svg.setAttribute("class",className),svg.setAttribute("data-icon",dataIcon),svg.appendChild(use),el.parentNode.replaceChild(svg,el)}

/*!
 * Responsive wrapper embeds, iframes, etc
 * @author Erik Runyon
 * Updated 2020-09-24 SMM
 * Requires site.css
 * Inspired by https://gist.github.com/davatron5000/e9ef20f1d2ba4d9099711064c644d155
 */
function fitEmbed(embeds){
  for(var i=0; i<embeds.length; i++) {
    var embed = embeds[i],
        width = embed.getAttribute('width'),
        height = embed.getAttribute('height'),
        aspectRatio = height/width,
        parentDiv = embed.parentNode,
        divOuter = document.createElement('div'),
        divInner = document.createElement('div')
    ;

    embed.removeAttribute('height');
    embed.removeAttribute('width');

    // Prevents the embed from exceeding the intial width
    divOuter.className = 'embed-outer';
    divOuter.style.maxWidth = width + 'px';
    divInner.className = 'embed-inner';
    divInner.style.paddingBottom = aspectRatio * 100 + '%';
    divOuter.appendChild(divInner);

    embed.parentNode.replaceChild(divOuter, embed);
    parentDiv.style.width = width + 'px';
    divInner.appendChild(embed);
  }
}
var sources = [
      'iframe[src*="youtube.com"]',
      'iframe[src*="youtube-nocookie.com"]',
      'iframe[src*="vimeo.com"]'
    ],
    embeds = document.querySelectorAll(sources.join(','))
;
if(embeds.length) {
  fitEmbed(embeds);
}

/*!
 * Video Placeholder
 * @author Erik Runyon
 * Updated 2020-09-24 SMM
 */
document.addEventListener('DOMContentLoaded', function(){
  document.body.querySelectorAll('.video').forEach(function(item) {
    var video = item,
        play_button = document.createElement('div')
    ;
    play_button.setAttribute('class', 'play');

    video.appendChild(play_button);
    video.addEventListener('click', loadVideo, false);
  });

  function loadVideo(e){
    e.preventDefault();

    var el = this,
        ww = window.innerWidth,
        img = el.getElementsByTagName('img')[0],
        ratio = img.height / img.width,
        w = img.width,
        h = Math.floor(w * ratio),
        href = el.getAttribute('href'),
        service = (href.indexOf('vimeo') >= 0) ? 'vimeo' : 'youtube',
        baseurl = (service == 'youtube') ? 'https://www.youtube-nocookie.com/embed/' : 'https://player.vimeo.com/video/',
        id = (service == 'youtube') ? getURLParameter('v', href) : href.split('/').pop()
    ;
    try { ga('send', 'event', 'Play Video', href); } catch(err) {}
    if (el.classList.contains('lightbox')) return;

    el.parentNode.innerHTML = '<iframe data-init="false" width="' + w + '" height="' + h + '" frameborder="0" src="' + baseurl + id + '?autoplay=1&amp;rel=0&amp;wmode=transparent&amp;vq=hd720" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>';
    fitEmbed(document.querySelectorAll('iframe[data-init="false"]'));
    document.querySelectorAll('iframe[data-init="false"]')[0].setAttribute('data-init', true);
  }
});
