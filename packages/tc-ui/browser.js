require('./main.css');
const edit = require('./pages/edit');
const view = require('./pages/view');

const pages = {
	edit,
	view,
};

const { pageType } = document.documentElement.dataset;

if (pageType && pages[pageType]) {
	pages[pageType].init();
}

