// ==UserScript==
// @name         Extract Steam community market login cookie
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  log the steam comminity market security cookies to the console
// @author       Han Li
// @require      https://cdnjs.cloudflare.com/ajax/libs/babel-core/5.6.15/browser-polyfill.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/babel-core/5.6.15/browser.min.js
// @include      https://steamcommunity.com/market/listings/*
// @include      http://steamcommunity.com/market/listings/*
// ==/UserScript==

/* jshint ignore:start */
var inline_src = (<><![CDATA[
    /* jshint ignore:end */
    /* jshint esnext: true */
    
    // Your code here...
    const cookiesLongString = document.cookie;
    const cookieStrings = cookiesLongString.split(';');
    const domain = '.steamcommunity.com';
    const targetCookieNames = ['Steam_Language', 'steamLogin', 'steamLoginSecure', 'steamMachineAuth76561198412716157', 'steamRememberLogin', 'webTradeEligibility', 'sessionid'];    
    const cookies = {};
    cookieStrings.forEach((cookie) => {
       const splitIndex = cookie.indexOf('=');
       if(splitIndex){
           const name = cookie.substring(0, splitIndex).trim();
           const value = cookie.substring(splitIndex+1);
           cookies[name] = value;
       } 
    });
    const result = [];
    targetCookieNames.forEach((name) => {
        if(cookies[name]){
            result.push({name, value: cookies[name], domain});
        }
    });
    console.log(JSON.stringify(result));


    /* jshint ignore:start */
    ]]></>).toString();
    var c = babel.transform(inline_src);
    eval(c.code);
    /* jshint ignore:end */