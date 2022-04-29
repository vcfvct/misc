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

(async () => {
	const targetButtonSelector = 'button.mb-8';
	await waitFor(targetButtonSelector);
	const selectButtons = Array.from(document.querySelectorAll(targetButtonSelector));
	const disabledButtons = selectButtons.filter(b => b.getAttribute('disabled') === 'disabled');
	// console.log(selectButtons.length, disabledButtons.length);
	if (selectButtons.length === disabledButtons.length) {
		console.log(`Not available, sleep and refresh --- ${new Date().toISOString()}`);
		setTimeout(() => location.reload(), 5 * 1000);
	} else {
		console.log(`stop refreshing and send notification --- ${new Date().toISOString()}`);
		const params = new Proxy(new URLSearchParams(window.location.search), {
			get: (searchParams, prop) => searchParams.get(prop),
		});
		const notificationDetails = {
			text: 'New Room available',
			title: `Date: ${params.dateFrom}`,
			timeout: 10000,
		};
		notificationDetails.onclick = () => {
			parent.focus();
			window.focus(); //just in case, older browsers
			this.close();
		}
		GM_notification(notificationDetails);
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
