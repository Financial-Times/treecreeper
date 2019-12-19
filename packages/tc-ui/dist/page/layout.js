"use strict";

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

const {
  h
} = require('preact');

const {
  getAssetReferences
} = require("./asset-references");

const toKebabCase = string => string.split(' ').map(str => str.toLowerCase()).join('-');

const SideBar = ({
  nav
}) => h("nav", {
  className: "o-layout__navigation"
}, h("ol", null, nav.map(({
  title,
  linkText
}) => h("li", null, h("a", {
  href: `#${toKebabCase(title)}`
}, linkText || title)))));

const {
  HeadAssets,
  TailAssets
} = require("./asset-loading");

const {
  Message
} = require("../components/messages");

const Layout = props => {
  const assetPaths = getAssetReferences(props);
  const {
    includeFooter = true,
    Header,
    Footer
  } = props;
  return h("html", {
    className: "core",
    lang: "en",
    "data-page-type": props.pageType
  }, h("head", null, h("title", null, props.pageTitle ? `${props.pageTitle} - Biz Ops admin` : `Biz Ops admin`), h("meta", {
    name: "viewport",
    content: "width=device-width, initial-scale=1.0",
    charset: "UTF-8"
  }), h(HeadAssets, assetPaths)), h("body", null, props.message ? h(Message, _extends({}, props, {
    isBanner: true
  })) : null, h("div", {
    className: `o-layout o-layout--${props.layout || 'docs'}`,
    "data-o-component": "o-layout",
    "data-o-layout-nav-heading-selector": ".section-heading, .record-title"
  }, h(Header, props), props.noSidebar ? null : h("div", {
    className: "o-layout__sidebar"
  }, props.sideBarNav ? h(SideBar, {
    nav: props.sideBarNav
  }) : null), props.children, includeFooter ? h(Footer, props) : null), h(TailAssets, assetPaths)));
};

module.exports = Layout;