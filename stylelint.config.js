/** @type {import('stylelint').Config} */
export default {
    extends: ["stylelint-config-standard-scss"],
    plugins: ["stylelint-selector-bem-pattern"],
    rules: {
        "selector-class-pattern": null,
        "plugin/selector-bem-pattern": {
            preset: "bem"
        },
    }
};