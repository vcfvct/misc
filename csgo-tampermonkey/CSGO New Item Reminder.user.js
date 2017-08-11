// ==UserScript==
// @name         CSGO New Item Reminder
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Auto Refresh page if no item is changed in the page. When new item appears, there will be Desktop notification as well as info banner for reminding.
// @author       Han Li
// @require      https://cdnjs.cloudflare.com/ajax/libs/babel-core/5.6.15/browser-polyfill.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/babel-core/5.6.15/browser.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js
// @include      https://steamcommunity.com/market/listings/730/*
// @include      http://steamcommunity.com/market/listings/730/*
// @grant GM_addStyle
// @grant GM_notification
// ==/UserScript==

/* jshint ignore:start */
var inline_src = (<><![CDATA[
/* jshint ignore:end */
/* jshint esnext: true */

// Your code here...

	GM_addStyle('#refresh-button { position: fixed; right: 3px; bottom: 50%; height: 40px; width: 80px;  background-color: #55E; color: #FFF; border-radius: 6px;}');
	GM_addStyle('#info-banner {position: fixed; top: 0; height: 40px; width: 100%;  background-color: yellow; color: black; border-radius: 6px; font-size: 2em!important; text-align:center; z-index: 403;}');

	let pageTitle = $(document).find("title").text();
	let itemNumber = parseInt($('#searchResults_total').text().replace(/,/g,''));
	let previousItemNumber = parseInt(sessionStorage.getItem(pageTitle));
	//set new Item number to session storage so even when item count descrease, we still get covered on next refresh.
	sessionStorage.setItem(pageTitle, itemNumber);

	const refreshKey = pageTitle + '-refresh';
	let refreshing = JSON.parse(sessionStorage.getItem(refreshKey));
	console.log(`page loaded: prev: '${previousItemNumber}' current: '${itemNumber}'. time: ${new Date()}`);

	if (refreshing && itemNumber > previousItemNumber) {
	    refreshing = false;
	    sessionStorage.setItem(refreshKey, refreshing);
	    sessionStorage.setItem(pageTitle, itemNumber);
	    const msg = `Item increased from ${previousItemNumber} to ${itemNumber}. `;
	    var notificationDetails = {
	        text: msg,
	        title: 'Refresh Stopped, press the Button to resume refresh',
	        timeout: 10000,
	        onclick: function() {
	            console.log("Notice clicked.");
	            window.focus();
	        }
	    };
	    GM_notification(notificationDetails);
	    let infoBanner = $(`<div id='info-banner'><h1>${msg}</h1></div>`);
	    $('body').prepend(infoBanner);
	}


	let buttonText = getNextButtonState(refreshing);
	let refreshButton = $(`<input type="button" id="refresh-button" value="${buttonText}"/>`);

	refreshButton.on('click', () => {
	    refreshing = !refreshing;
	    refreshButton.prop('value', getNextButtonState(refreshing));
	    sessionStorage.setItem(refreshKey, refreshing);
	    if (refreshing) {
	        location.reload();
	    }
	    console.log(`after button click: ${refreshing}`);

	});

	if (refreshing) {
	    setTimeout(() => {
	            let shouldRefresh = JSON.parse(sessionStorage.getItem(refreshKey));
	            console.log('in setTimeout: ' + shouldRefresh);
	            if (shouldRefresh) {
	                location.reload();
	            }
	        },
	        61 * 1000
	    );
	}

	$('body').append(refreshButton);

	function getNextButtonState(refreshing) {
	    return refreshing ? 'Stop Refresh' : 'Start Refresh';
	}

/* jshint ignore:start */
]]></>).toString();
var c = babel.transform(inline_src);
eval(c.code);
/* jshint ignore:end */
