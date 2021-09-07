/*!
 * Load ND icons
 */
!function(e,t){"use strict";var icons=document.querySelectorAll("span.icon");for(i=0;i<icons.length;i++){var el=icons[i],className=el.getAttribute("class"),dataIcon=el.getAttribute("data-icon"),svg=document.createElementNS("http://www.w3.org/2000/svg","svg"),use=document.createElementNS("http://www.w3.org/2000/svg","use");use.setAttributeNS("http://www.w3.org/1999/xlink","xlink:href","#icon-"+dataIcon),svg.setAttribute("class",className),svg.setAttribute("data-icon",dataIcon),svg.appendChild(use),el.parentNode.replaceChild(svg,el)}
