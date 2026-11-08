const config = {};

// 163邮箱配置
config.email163Profile = {
    from: 'vcfvct@163.com',
    to: 'vcfvct@gmail.com',
    smtp: {
        host: 'smtp.163.com',
        port: 465,
        secure: true,
        auth: {
            user: 'vcfvct@163.com',
            pass: ''
        }
    }
}

config.emailGmailProfile = {
    from: 'vcfvct@gmail.com',
    to: 'vcfvct@163.com',
    smtp: {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: 'vcfvct@gmail.com',
            pass: ''
        }
    }
};;

module.exports = Object.freeze(config);
