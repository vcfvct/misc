const config = {};
// 扫描物品
config.itemHash = '%E2%98%85%20M9%20Bayonet';
// 登陆信息
const sessionid = '';
config.cookies = [
    { name: 'Steam_Language', value: 'schinese', domain: '.steamcommunity.com' },
    { name: 'steamLogin', value: '76561198412716157%7C%7CCAA1933E30FB6DC1D81394D84AB77221F6125EE0', domain: '.steamcommunity.com' },
    { name: 'steamLoginSecure', value: '76561198412716157%7C%7CEA3B72D2C6B88B5114834CC380C6034D63E038B4', domain: '.steamcommunity.com' },
    { name: 'steamMachineAuth76561198412716157', value: 'CBAD730388DACD5A42435060F2E1600CBE4C8E57', domain: '.steamcommunity.com' },
    { name: 'steamRememberLogin', value: '76561198412716157%7C%7C4e353c517591fcd8bcad5b1cdb8752ea', domain: '.steamcommunity.com' },
    { name: 'webTradeEligibility', value: '%7B%22allowed%22%3A1%2C%22allowed_at_time%22%3A0%2C%22steamguard_required_days%22%3A15%2C%22sales_this_year%22%3A0%2C%22max_sales_per_year%22%3A200%2C%22forms_requested%22%3A0%2C%22new_device_cooldown_days%22%3A7%2C%22time_checked%22%3A1505788588%7D', domain: '.steamcommunity.com' },
    { name: 'sessionid', value: process.env.sessionid || sessionid, domain: '.steamcommunity.com' }
];
// sohu邮箱配置
config.emailSohuProfile = {
    from: 'a21223550@sohu.com',
    to: '70924784@qq.com',
    smtp: {
        host: 'smtp.sohu.com',
        port: 25,
        auth: {
            user: 'a21223550@sohu.com',
            pw: ''
        }
    }
};
// 163邮箱配置
config.email163Profile = {
    from: 'vcfvct@163.com',
    to: '70924784@qq.com',
    smtp: {
        host: 'smtp.163.com',
        port: 465,
        secure: true,
        auth: {
            user: 'vcfvct@163.com',
            pass: ''
        }
    }
};

module.exports = Object.freeze(config);