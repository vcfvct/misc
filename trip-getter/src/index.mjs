
// (async () => {
// 	const res = await fetch('https://webapi.xanterra.net/v1/api/availability/hotels/grandcanyonlodges?date=05/30/2022&limit=1&is_group=false&nights=1');
// 	if(res.ok) {
// 		const data = await res.json();
// 		console.log(data);
// 	}
// })();
//

import { chromium } from 'playwright';
import EmailService from './email.mjs';

(async () => {
	// await checkAvailability();
	const emailService = new EmailService();
	emailService.sendEmail('new availability', 'hello world');

})();
//
async function checkAvailability() {
	const browser = await chromium.launch({headless: false, slowMo: 500});
	const page = await browser.newPage();
	await page.goto('https://reservations.ahlsmsworld.com/Yosemite/');
	await page.waitForSelector('#box-widget_InitialProductSelection');
	await page.selectOption('#box-widget_InitialProductSelection', { value: '2:_ALLPROPS_' });
	await page.fill('#box-widget_ArrivalDate', '07/29/2024');
	await page.fill('#box-widget_DepartureDate', '07/30/2024');
	await page.click('input[value="Check Availability"]:not([disabled])');
	await page.waitForSelector('.panel-search-details')
	// await page.screenshot({ path: 'local/example.png' });
	await browser.close();
}
