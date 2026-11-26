// Markup rules for the built HTML. `npm run build` runs html-validate over dist/.
// Loosening a rule is its own change, with the reason written here.
export default {
  root: true,
  extends: ['html-validate:recommended'],
  rules: {
    // React renders void elements as <input/>. That is valid HTML and it is not ours to
    // change; this rule is about style, not validity.
    'void-style': 'off',
  },
};
