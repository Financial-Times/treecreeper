"use strict";

require("./main.css");

const edit = require("./browser/edit");

const view = require("./browser/view");

const pages = {
  edit,
  view
};
const {
  pageType
} = document.documentElement.dataset;

if (pageType && pages[pageType]) {
  pages[pageType].init();
}