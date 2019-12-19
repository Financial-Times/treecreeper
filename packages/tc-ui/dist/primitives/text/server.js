"use strict";

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

const {
  h
} = require('preact');

const {
  WrappedEditComponent
} = require("../../components/edit-helpers");

const EditText = ({
  propertyName,
  value,
  required,
  lockedBy,
  disabled
}) => h("span", {
  className: "o-forms-input o-forms-input--text"
}, h("input", {
  name: `${propertyName}${lockedBy || disabled ? '-disabled' : ''}`,
  id: `id-${propertyName}`,
  className: "o-forms__text",
  type: "text",
  value: value || null,
  required: required ? 'required' : null,
  disabled: disabled
}));

module.exports = {
  ViewComponent: ({
    value,
    id
  }) => h("span", {
    id: id
  }, value),
  EditComponent: props => h(WrappedEditComponent, _extends({
    Component: EditText,
    componentType: "text"
  }, props))
};