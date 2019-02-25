// ==UserScript==
// @name         CSGO New Item Reminder
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Auto Refresh page if no item is changed in the page. When new item appears, there will be Desktop notification as well as info banner for reminding.
// @author       Han Li
// @include      https://steamcommunity.com/market/listings/730/*
// @include      http://steamcommunity.com/market/listings/730/*
// @grant GM_addStyle
// @grant GM_notification
// ==/UserScript==

GM_addStyle('#refresh-button { position: fixed; right: 3px; bottom: 50%; height: 40px; width: 80px;  background-color: #55E; color: #FFF; border-radius: 6px;}');
GM_addStyle('#info-banner {position: fixed; top: 0; height: 40px; width: 100%;  background-color: yellow; color: black; border-radius: 6px; font-size: 2em!important; text-align:center; z-index: 403;}');

(async () => {
	const pageTitle = document.title;
	const itemNumber = parseInt(document.getElementById('searchResults_total').innerHTML.replace(/,/g, ''));
	const previousItemNumber = parseInt(sessionStorage.getItem(pageTitle));
	//set new Item number to session storage so even when item count descrease, we still get covered on next refresh.
	sessionStorage.setItem(pageTitle, itemNumber);

	const refreshKey = pageTitle + '-refresh';
	let refreshing = JSON.parse(sessionStorage.getItem(refreshKey));
	console.info(`page loaded: prev: '${previousItemNumber}' current: '${itemNumber}'. time: ${new Date().toLocaleString()}`);

	if (refreshing && itemNumber > previousItemNumber) {
		refreshing = false;
		sessionStorage.setItem(refreshKey, refreshing);
		sessionStorage.setItem(pageTitle, itemNumber);
		const text = `Item '${pageTitle}' increased from ${previousItemNumber} to ${itemNumber}. `;
		const notificationDetails = {
			text,
			title: 'Refresh Stopped, press the Button to resume refresh',
			timeout: 10000,
			onclick: () => window.focus()
		};
		GM_notification(notificationDetails);
		const infoBanner = createDomElement(`<div id='info-banner'><h1>${msg}</h1></div>`);
		document.body.appendChild(infoBanner);
		clickGetAllFloatsButton();
	}

	const refreshButton = createDomElement(`<input type="button" id="refresh-button" value="${getNextButtonState(refreshing)}"/>`);

	refreshButton.addEventListener('click', () => {
		refreshing = !refreshing;
		refreshButton.setAttribute('value', getNextButtonState(refreshing));
		sessionStorage.setItem(refreshKey, refreshing);
		if (refreshing) {
			location.reload();
		}
		console.info(`after button click: ${refreshing}`);
	});

	if (refreshing) {
		setTimeout(() => {
			const shouldRefresh = JSON.parse(sessionStorage.getItem(refreshKey));
			console.info('in setTimeout: ' + shouldRefresh);
			shouldRefresh && location.reload();
		},
			61 * 1000
		);
	}
	document.body.appendChild(refreshButton);
})();

/**
 * get button text based on the refreshing status.
 */
function getNextButtonState(refreshing) {
	return refreshing ? 'Stop Refresh' : 'Start Refresh';
}

/**
 * click the Get All Floats button which is added by the float check chrome extension.
 */
async function clickGetAllFloatsButton() {
	await waitFor('.float-btn');
	const floatButtons = document.querySelectorAll('.float-btn');
	const allFloatsButton = Array.from(floatButtons).find((btn) => btn.textContent.includes('Get All Floats'));
	allFloatsButton && allFloatsButton.click();
}
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
