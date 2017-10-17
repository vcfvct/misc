const config = {};
// 扫描物品
config.itemHash = '%E2%98%85%20M9%20Bayonet';

// sohu邮箱配置
config.emailSohuProfile = {
    from: 'a21223550@sohu.com',
    to: '70924784@qq.com',
    smtp: {
        host: 'smtp.sohu.com',
        port: 25,
        auth: {
            user: 'a21223550@sohu.com',
            pass: ''
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
// email 主题
config.emailSubject = '有新物品了！';

// 音频文件的相对路径
config.soundFilePath = 'asset/hammer.mp3';

// 扫描的最大最小间隔，在这个区间随机产生。如果两个值相等，就是一个固定时间间隔。
config.interval = {
    min: 15,
    max: 15
};

// 可以规定： 1. 最低价格 2, 磨损区间， 3.磨损区间+价格区间
config.itemCriterias = [
    {
        float: {
            min: 0.15,
            max: 0.17
        }
    },
    {
        price: {
            max: 800
        }
    },
    {
        float: {
            min: 0.5,
            max: 0.6
        },
        price: {
            max: 1000,
            min: 2000
        }
    }
];

(() => {
    // 设置再cookies文件夹下面需要用到的文件名
    const cookiesToInclude = ['c1', 'c2', 'c3'];
    config.cookies = cookiesToInclude.map((fileName) => require(`./cookies/${fileName}`));
})();

module.exports = Object.freeze(config);