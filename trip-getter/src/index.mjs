
// (async () => {
// 	const res = await fetch('https://webapi.xanterra.net/v1/api/availability/hotels/grandcanyonlodges?date=05/30/2022&limit=1&is_group=false&nights=1');
// 	if(res.ok) {
// 		const data = await res.json();
// 		console.log(data);
// 	}
// })();
//

import { chromium } from 'playwright';

(async () => {
	const browser = await chromium.launch({headless: false});
	const page = await browser.newPage();
	await page.goto('https://reservations.ahlsmsworld.com/Yosemite/');
	await page.screenshot({ path: 'example.png' });
	await browser.close();
})();
