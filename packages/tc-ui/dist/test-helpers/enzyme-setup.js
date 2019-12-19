"use strict";

const {
  JSDOM
} = require('jsdom'); // eslint-disable-line  import/no-extraneous-dependencies


const jsdom = new JSDOM('<!doctype html><html><body></body></html>');
const {
  window
} = jsdom;

function copyProps(src, target) {
  Object.defineProperties(target, { ...Object.getOwnPropertyDescriptors(src),
    ...Object.getOwnPropertyDescriptors(target)
  });
}

global.window = window;
global.document = window.document;
global.navigator = {
  userAgent: 'node.js'
};

global.requestAnimationFrame = function (callback) {
  return setTimeout(callback, 0);
};

global.cancelAnimationFrame = function (id) {
  clearTimeout(id);
};

copyProps(window, global);

const Enzyme = require('enzyme'); // eslint-disable-line  import/no-extraneous-dependencies


const {
  Adapter
} = require('enzyme-adapter-preact-pure'); // eslint-disable-line  import/no-extraneous-dependencies


Enzyme.configure({
  adapter: new Adapter()
});
module.exports = Enzyme;