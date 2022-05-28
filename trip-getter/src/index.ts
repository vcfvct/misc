
(async () => {
	const res = await fetch('https://webapi.xanterra.net/v1/api/availability/hotels/grandcanyonlodges?date=05/30/2022&limit=1&is_group=false&nights=1');
	if(res.ok) {
		const data = await res.json();
		console.log(data);
	}
})();
