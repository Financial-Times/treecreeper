require('./main.css');
const pages = require('./pages/browser');

const tcPageContainer = document.querySelector('[data-tc-page-type]');

if (tcPageContainer) {
	pages[tcPageContainer.dataset.tcPageType].init();
}
