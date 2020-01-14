const polyfillsJS = {};

const polyfills = {
	// https://github.com/cypress-io/cypress-example-recipes/blob/master/examples/stubbing-spying__window-fetch/cypress/integration/polyfill-fetch-from-tests-spec.js
	fetch: {
		get() {
			cy.request(
				'https://unpkg.com/whatwg-fetch@3.0.0/dist/fetch.umd.js',
			).then(response => {
				polyfillsJS.fetch = response.body;
			});
		},
		apply(win) {
			// remove window.fetch to force a polyfill load as cypress doesn't support fetch
			delete win.fetch;
			// eval whatwg-fetch on the test window to force a global polyfill load
			win.eval(polyfillsJS.fetch);
		},
	},
	// eval URLSearchParams polyfill to fix broken Electron/Chromium 59 URLSearchParameters.toString behaviour
	URLSearchParams: {
		get() {
			cy.request(
				'https://unpkg.com/@ungap/url-search-params@0.1.2/min.js',
			).then(response => {
				polyfillsJS.URLSearchParams = response.body;
			});
		},
		apply(win) {
			win.eval(polyfillsJS.URLSearchParams);
		},
	},
};

const getPolyfills = () => {
	Object.values(polyfills).forEach(({ get }) => get());
};

const applyPolyfills = win => {
	Object.values(polyfills).forEach(({ apply }) => apply(win));
};

module.exports = { getPolyfills, applyPolyfills };
