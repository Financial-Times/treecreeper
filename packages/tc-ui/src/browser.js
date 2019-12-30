require('./main.css');
const pages = require('./pages/browser');

const { pageType } = document.documentElement.dataset;

if (pageType && pages[pageType]) {
	pages[pageType].init();
}
