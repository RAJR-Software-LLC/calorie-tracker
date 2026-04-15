/* Re-export palette for TS/TSX (tailwind.config.js requires palette.js directly). */
/* This TS file must use CommonJS require so it can import the .js palette module. */
/* eslint-disable @typescript-eslint/no-require-imports */
const { light, dark } = require('./palette.js');
/* eslint-enable @typescript-eslint/no-require-imports */

export { light, dark };
