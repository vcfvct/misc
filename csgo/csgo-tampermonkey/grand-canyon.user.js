// ==UserScript==
// @name         Grand Canyon Reminder
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Auto Refresh page if no room is changed in the page. When new room appears, there will be Desktop notification as well as info banner for reminding.
// @author       Han Li
// @match        https://secure.grandcanyonlodges.com/booking/lodging-search*
// @grant GM_addStyle
// @grant GM_notification
// ==/UserScript==

GM_addStyle('#info-banner {position: fixed; top: 0; height: 40px; width: 100%;  background-color: yellow; color: black; border-radius: 6px; font-size: 2em!important; text-align:center; z-index: 403;}');

(async () => {
	const targetButtonSelector = 'button.mb-8';
	await waitFor(targetButtonSelector);
	await sleep(500); // button is enabled after the availability api call, need some explicit wait.
	const selectButtons = Array.from(document.querySelectorAll(targetButtonSelector));
	const disabledButtons = selectButtons.filter(b => b.getAttribute('disabled') === 'disabled');
	console.log(selectButtons.length, disabledButtons.length);
	if (selectButtons.length === disabledButtons.length) {
		const refreshInterval = 5; // 页面刷新间隔
		console.log(`Not available, sleep and refresh --- ${new Date().toISOString()}`);
		setTimeout(() => location.reload(), refreshInterval * 1000);
	} else {
		console.log(`stop refreshing and send notification --- ${new Date().toISOString()}`);
		const params = new Proxy(new URLSearchParams(window.location.search), {
			get: (searchParams, prop) => searchParams.get(prop),
		});
		const notificationTimeout = 10; // notification显示时间
		const notificationDetails = {
			text: 'New Room available',
			title: `Date: ${params.dateFrom}`,
			timeout: notificationTimeout * 1000,
		};
		notificationDetails.onclick = () => {
			parent.focus();
			window.focus(); //just in case, older browsers
			this.close();
		}
		GM_notification(notificationDetails);
		// create info banner
		const infoBanner = createDomElement(`<div id='info-banner'><h1>New Room available!</h1></div>`);
		console.log(infoBanner);
		document.body.appendChild(infoBanner);

	}
})();

/**
 * wait for element to appear in dom.
 * @returns a Promise which resolves when the element shows up.
 */
function waitFor(selector) {
	return new Promise(function (res, rej) {
		waitForElementToDisplay(selector, 200);
		function waitForElementToDisplay(selector, time) {
			if (document.querySelector(selector) != null) {
				res(document.querySelector(selector));
			}
			else {
				setTimeout(function () {
					waitForElementToDisplay(selector, time);
				}, time);
			}
		}
	});
}

/**
 * create a dom element by dom string
 */
function createDomElement(domString) {
	return new DOMParser().parseFromString(domString, 'text/html').documentElement;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
