require('./main.css');
const pages = require('./pages/browser');

const { pageType } = document.querySelector('[data-tc-page-type]').dataset;

if (pageType && pages[pageType]) {
	pages[pageType].init();
}
