// ==UserScript==
// @name         本地刷新
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  refresh localhost page every x second. Matching localhost with all ports.  
// @author       Han Li
// @require      https://cdnjs.cloudflare.com/ajax/libs/babel-core/5.6.15/browser-polyfill.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/babel-core/5.6.15/browser.min.js
// @include        http://localhost*/*
// ==/UserScript==

/* jshint ignore:start */
var inline_src = (<><![CDATA[
/* jshint ignore:end */
/* jshint esnext: true */

// Your code here...
    //刷新间隔（秒）
    let refreshInterval = 15;
    setTimeout(() => {
      location.reload();
    }, refreshInterval * 1000);

/* jshint ignore:start */
]]></>).toString();
var c = babel.transform(inline_src);
eval(c.code);
/* jshint ignore:end */
