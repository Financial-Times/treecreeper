"use strict";

const {
  h,
  Fragment
} = require('preact');

const HeadAssets = ({
  mainCss,
  origamiCss
}) => h(Fragment, null, h("link", {
  rel: "icon",
  type: "image/png",
  href: "https://www.ft.com/__origami/service/image/v2/images/raw/ftlogo-v1%3Abrand-ft-logo-square?source=biz-ops-admin&width=32&height=32&format=png",
  sizes: "32x32"
}), h("link", {
  rel: "icon",
  type: "image/png",
  href: "https://www.ft.com/__origami/service/image/v2/images/raw/ftlogo-v1%3Abrand-ft-logo-square?source=biz-ops-admin&width=194&height=194&format=png",
  sizes: "194x194"
}), h("link", {
  rel: "apple-touch-icon",
  sizes: "180x180",
  href: "https://www.ft.com/__origami/service/image/v2/images/raw/ftlogo-v1%3Abrand-ft-logo-square?source=biz-ops-admin&width=180&height=180&format=png"
}), h("link", {
  rel: "stylesheet",
  href: origamiCss
}), h("link", {
  href: mainCss,
  rel: "stylesheet"
}));

const TailAssets = ({
  mainJs,
  origamiJs
}) => h(Fragment, null, h("script", {
  src: mainJs,
  defer: true
}), h("script", {
  defer: true,
  src: origamiJs
}), h("script", {
  dangerouslySetInnerHTML: {
    __html: "document.documentElement.classList.replace('core', 'enhanced')"
  }
}));

module.exports = {
  HeadAssets,
  TailAssets
};