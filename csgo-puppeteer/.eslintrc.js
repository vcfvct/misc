module.exports = {
    "extends": "standard",
    "rules": {
        "semi": [2, "always"],
        "space-before-function-paren": ["error", {
            "anonymous": "always",
            "named": "never",
            "asyncArrow": "always"
        }],
        "indent": ["error", 4, { "SwitchCase": 1 }],
        "eol-last": "off",
        "quotes": "off",
        "wrap-iife": "off"
    }
};