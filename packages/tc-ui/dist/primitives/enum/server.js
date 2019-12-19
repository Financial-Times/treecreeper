"use strict";

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

const {
  getEnums
} = require('@financial-times/tc-schema-sdk');

const {
  h,
  Fragment
} = require('preact');

const {
  WrappedEditComponent
} = require("../../components/edit-helpers");

const {
  autolink
} = require("../../components/helpers");

const text = require("../text/server");

const Option = ({
  option,
  selected
}) => h("option", {
  value: option === `Don't know` ? 'null' : option,
  selected: option === selected ? 'true' : null
}, option);

const OptionsInfo = ({
  type
}) => {
  const enumWithMeta = getEnums({
    withMeta: true
  })[type];
  const optionDefs = Object.values(enumWithMeta.options);
  const hasOptionDescriptions = !!optionDefs[0].description;

  if (!hasOptionDescriptions) {
    return null;
  }

  return h(Fragment, null, h("p", {
    dangerouslySetInnerHTML: {
      __html: autolink(enumWithMeta.description)
    }
  }), h("dl", null, optionDefs.map(({
    value,
    description
  }) => h(Fragment, null, h("dt", null, value), h("dd", null, description)))));
};

const EditEnum = props => {
  const {
    propertyName,
    value,
    options,
    disabled
  } = props;
  const optionsWithDefault = ["Don't know"].concat(options);
  return h("span", {
    className: "o-forms-input o-forms-input--select"
  }, h("select", {
    disabled: disabled,
    id: `id-${propertyName}`,
    name: propertyName
  }, optionsWithDefault.map(option => h(Option, {
    option: option,
    selected: value || "Don't know"
  }))));
};

module.exports = {
  ViewComponent: text.ViewComponent,
  EditComponent: props => h(WrappedEditComponent, _extends({
    Component: EditEnum,
    componentType: "enum",
    expandableContent: h(OptionsInfo, props)
  }, props))
};