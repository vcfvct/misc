// ==UserScript==
// @name         CSGO New Price Reminder in C5Game
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Auto Refresh page if no new price in the page. When new price appears, there will be Desktop notification as well as info banner for reminding.
// @author       Han Li
// @require      https://cdnjs.cloudflare.com/ajax/libs/babel-core/5.6.15/browser-polyfill.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/babel-core/5.6.15/browser.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js
// @include      https://www.c5game.com/csgo/item/index.html*
// @grant GM_addStyle
// @grant GM_notification
// ==/UserScript==

/* jshint ignore:start */
var inline_src = (<><![CDATA[
/* jshint ignore:end */
/* jshint esnext: true */

// Your code here...

	GM_addStyle('#refresh-button {width: 100px; color: #FFF; border-radius: 6px;}');
	GM_addStyle('#info-banner {position: fixed; top: 0; height: 40px; width: 100%;  background-color: yellow; color: black; border-radius: 6px; font-size: 2em!important; text-align:center; z-index: 1000;}');
    //we are only interested in purchase page. 
    let isPurchasePage = document.URL.includes('&type=P');
    if(isPurchasePage){
    	const CHECK_INTERVAL = 1;
    	let waitData = setInterval(() => {
    	  if($('.sale-item-table tbody:nth-child(2) tr:first td.item-name').length){
    	  	clearInterval(waitData);

    	  	let pageTitle = $(document).find("title").text();
			let curPrice = parseFloat($('.sale-item-table tbody:nth-child(2) tr:first td:nth-child(4) span').text().substring(1));
			let previousPrice = parseFloat(sessionStorage.getItem(pageTitle));
			//set new price to session storage so even when item count descrease, we still get covered on next refresh.
			sessionStorage.setItem(pageTitle, curPrice);

			const refreshKey = pageTitle + '-refresh';
			let refreshing = JSON.parse(sessionStorage.getItem(refreshKey));
			console.log(`page loaded: prev: '${previousPrice}' current: '${curPrice}'. time: ${new Date()}`);

			if (refreshing && curPrice !== previousPrice) {
			    refreshing = false;
			    sessionStorage.setItem(refreshKey, refreshing);
			    sessionStorage.setItem(pageTitle, curPrice);
			    const msg = `Top pirce changed from ${previousPrice} to '${curPrice}.' `;
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
			    let infoBanner = $(`<div id='info-banner'><p>${msg}</p></div>`);
			    $('body').prepend(infoBanner);
			}


			let buttonText = getNextButtonState(refreshing);
			let buttonBgColor = getNextButtonBg(refreshing);
			let refreshButton = $(`<input type="button" style="background-color: ${buttonBgColor}" id="refresh-button" value="${buttonText}"/>`);

			refreshButton.on('click', () => {
			    refreshing = !refreshing;   
			    sessionStorage.setItem(refreshKey, refreshing);
			    if (refreshing) {
			        location.reload();
			    }else{
			    	let button = $('#refresh-button');
			   		button.prop('value', getNextButtonState(refreshing));
			   		button.css("background-color", getNextButtonBg(refreshing));
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

			//$('body').append(refreshButton);
			$('.sale-item-table tbody:nth-child(2) tr:first td:nth-child(3) span').replaceWith(refreshButton);

			function getNextButtonState(refreshing) {
			    return refreshing ? '停止刷新' : '开始刷新';
			}
			function getNextButtonBg(refreshing) {
			    return refreshing ? '#55E' : '#268829';
			}
    	  }else{
    	  	console.log(`Wait for another ${CHECK_INTERVAL} second[s] to load data`);
    	  }	
    	},CHECK_INTERVAL * 1000);
	}

/* jshint ignore:start */
]]></>).toString();
var c = babel.transform(inline_src);
eval(c.code);
/* jshint ignore:end */
