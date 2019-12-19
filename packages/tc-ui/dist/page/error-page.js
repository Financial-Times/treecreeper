"use strict";

const {
  h
} = require('preact');

const ErrorPage = ({
  error,
  status
} = {}) => h("main", {
  className: "o-layout__main"
}, h("div", {
  className: "o-layout-typography"
}, h("h1", null, "Oops! - Something went wrong")), h("div", {
  className: "o-message o-message--inner o-message--alert o-message--error biz-ops-alert",
  "data-o-component": "o-message"
}, h("div", {
  className: "o-message__container"
}, h("div", {
  className: "o-message__content"
}, h("p", {
  className: "o-message__content-main"
}, h("span", {
  className: "o-message__content-highlight"
}, status, " Error")), h("p", {
  className: "o-message__content-additional"
}, error.message || error)))));

module.exports = ErrorPage;