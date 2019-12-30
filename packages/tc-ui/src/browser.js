require('./main.scss');
const pages = require('./pages/browser');

const { pageType } = document.documentElement.dataset;

if (pageType && pages[pageType]) {
	pages[pageType].init();
}
