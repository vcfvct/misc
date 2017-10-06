#!/usr/bin/env node
const ItemService = require('../src/item');

const itemService = new ItemService();
const itemInfo = { "listingid": "1715166347063219246", "price": 49566, "fee": 7434, "publisher_fee_app": 730, "publisher_fee_percent": "0.10000000149011612", "currencyid": 2003, "steam_fee": 2478, "publisher_fee": 4956, "converted_price": 386486, "converted_fee": 57972, "converted_currencyid": 2023, "converted_steam_fee": 19324, "converted_publisher_fee": 38648, "converted_price_per_unit": 386486, "converted_fee_per_unit": 57972, "converted_steam_fee_per_unit": 19324, "converted_publisher_fee_per_unit": 38648, "asset": { "currency": 0, "appid": 730, "contextid": "2", "id": "12003457373", "amount": "1", "market_actions": [{ "link": "steam:\/\/rungame\/730\/76561202255233023\/+csgo_econ_action_preview%20M%listingid%A%assetid%D11673333051439167165", "name": "\u5728\u6e38\u620f\u4e2d\u68c0\u89c6\u2026" }] } };
~async function getMyFloat() {
  const float = await itemService.getFloat(itemInfo);
  console.log(float);
}();