"use strict";

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

const {
  h
} = require('preact');

const {
  WrappedEditComponent
} = require("../../components/edit-helpers");

const getBooleanLabel = value => {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return 'Unknown';
};

const Checkbox = ({
  name,
  checkboxValue,
  disabled,
  userValue
}) => {
  const label = getBooleanLabel(checkboxValue);
  return h("label", null, h("input", {
    type: "radio",
    name: name,
    value: checkboxValue.toString(),
    "aria-label": label,
    id: `radio1-${name}`,
    checked: userValue === checkboxValue ? 'true' : null,
    disabled: disabled
  }), h("span", {
    className: "o-forms-input__label",
    "aria-hidden": "true"
  }, label));
};

const EditBoolean = props => {
  const {
    propertyName,
    value,
    disabled
  } = props;
  return h("span", {
    className: "o-forms-input o-forms-input--radio-round o-forms-input--inline"
  }, h(Checkbox, {
    name: propertyName,
    checkboxValue: true,
    disabled: disabled,
    userValue: value
  }), h(Checkbox, {
    name: propertyName,
    checkboxValue: false,
    disabled: disabled,
    userValue: value
  }));
};

module.exports = {
  ViewComponent: ({
    value,
    id
  }) => h("span", {
    id: id
  }, getBooleanLabel(value)),
  EditComponent: props => h(WrappedEditComponent, _extends({
    Component: EditBoolean,
    componentType: "boolean",
    wrapperTag: "div",
    wrapperProps: {
      role: 'group',
      'aria-labelledby': 'inline-radio-round-group-title'
    }
  }, props)),
  parser: value => value === undefined ? undefined : value === 'true',
  hasValue: value => typeof value === 'boolean'
};