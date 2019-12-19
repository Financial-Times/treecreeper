"use strict";

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

const {
  h
} = require('preact');

const autolinker = require('autolinker');

const {
  LinkToRecord
} = require("./helpers");

const autolink = text => autolinker.link(text || '');

const FieldTitle = ({
  label,
  description,
  expandableContent,
  lockedBy
}) => h("span", {
  className: "o-forms-title"
}, h("span", {
  className: "o-forms-title__main",
  id: "inline-radio-round-group-title"
}, label, ":"), h("span", {
  className: "o-forms-title__prompt description-text"
}, h("span", {
  dangerouslySetInnerHTML: {
    __html: autolink(description)
  }
}), expandableContent ? h("div", {
  "data-o-component": "o-expander",
  className: "o-expander",
  "data-o-expander-shrink-to": "hidden",
  "data-o-expander-collapsed-toggle-text": "more info",
  "data-o-expander-expanded-toggle-text": "less"
}, ' ', h("button", {
  className: "o-expander__toggle o--if-js",
  type: "button"
}, "more info"), h("div", {
  className: "o-expander__content"
}, expandableContent)) : null, lockedBy ? h("div", {
  className: "o-forms__additional-info"
}, "Not editable. Automatically populated by", ' ', h(LinkToRecord, {
  type: "System",
  value: {
    code: lockedBy
  }
}), ".") : null));

const WrappedEditComponent = props => {
  props = { ...props,
    disabled: !!props.lockedBy
  };
  const {
    Component
  } = props;
  const WrapperTag = props.wrapperTag || 'label';
  return h(WrapperTag, _extends({
    className: "o-forms-field",
    "data-biz-ops-type": props.componentType,
    "data-type": props.dataType
  }, props.wrapperProps || {}), h(FieldTitle, props), h(Component, props));
};

module.exports = {
  WrappedEditComponent
};