"use strict";

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

const {
  h
} = require('preact');

const {
  WrappedEditComponent
} = require("../../components/edit-helpers");

const {
  formatDateTime
} = require("../../components/helpers");

const convertValueForHTMLInput = (wrappedValue, type) => {
  if (!(wrappedValue && wrappedValue.formatted)) return null;
  const value = wrappedValue.formatted;
  if (type === 'Time') return value;
  const date = new Date(value).toISOString();
  /* This is a hack to remove Z in order to prepopulate a time-date field.
  Revisit this if a time needs to be added as field value.
  */

  return type === 'DateTime' ? date.split('Z')[0] : date.split('T')[0];
};

const EditTemporal = ({
  type,
  propertyName,
  value,
  required,
  disabled
}) => {
  const inputType = type === 'DateTime' ? 'datetime-local' : type.toLowerCase();
  return h("span", {
    className: "o-forms-input o-forms-input--text"
  }, h("input", {
    name: `${propertyName}${disabled ? '-disabled' : ''}`,
    id: `id-${propertyName}`,
    type: `${inputType}`,
    value: convertValueForHTMLInput(value, type),
    required: required ? 'required' : null,
    disabled: disabled ? 'disabled' : null
  }));
};

module.exports = {
  EditComponent: props => h(WrappedEditComponent, _extends({
    Component: EditTemporal,
    componentType: "temporal"
  }, props)),
  ViewComponent: ({
    value,
    id,
    type
  }) => h("span", {
    id: id
  }, formatDateTime(value.formatted, type)),
  hasValue: value => !!value.formatted,
  graphqlFragment: propName => `${propName} {formatted}`
};