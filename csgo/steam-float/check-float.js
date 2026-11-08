#!/usr/bin/env node

const fs = require('fs');

const FloatClient = require('csgo-float');
const config = require('./config');

const client = new FloatClient({
    account_name: 'csgospree1',
    password: config.pass || process.env.CSGO_PW,
    sha_sentryfile: fs.readFileSync('access.sentry'),
    // auth_code: ''
}, true);

client
    .on('ready', () => {

        // client.requestFloat('S76561198190349706A4757476613D16467978012840927110')
        client.requestFloat('M3056112593553312240A11903555630D3171495477318448316')
            .then(floatValue => console.log('Skin float value:', floatValue))

    })
    .on('sentry', data => {
        console.log('sentry', data)
        fs.writeFileSync('access.sentry', data)
    })
    .on('error', err => console.log(err))

setTimeout(() => {
    client.requestFloat('S76561198190349706A4757476613D16467978012840927110')
        .then(floatValue => console.log('Skin float value:', floatValue))
}, 10000);