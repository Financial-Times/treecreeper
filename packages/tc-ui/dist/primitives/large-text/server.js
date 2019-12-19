"use strict";

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

const {
  h,
  Fragment
} = require('preact');

const {
  WrappedEditComponent
} = require("../../components/edit-helpers");

const {
  markdown
} = require("../../components/helpers");

const outputFreeText = (text = '') => text;

const EditLargeText = props => {
  const {
    propertyName,
    value,
    dataType,
    disabled
  } = props;
  return h(Fragment, null, h("span", {
    className: "o-forms-input o-forms-input--textarea"
  }, h("textarea", {
    name: propertyName,
    id: `id-${propertyName}`,
    rows: dataType === 'Document' ? '40' : '8',
    disabled: disabled
  }, outputFreeText(value))), dataType === 'Document' ? h("div", {
    className: "document-edit-tools"
  }, "Edit using github flavoured markdown or use the\xA0", h("button", {
    className: "o-buttons wysiwyg-toggle",
    type: "button"
  }, "wysiwyg HTML editor")) : null);
};

module.exports = {
  EditComponent: props => h("div", {
    className: props.dataType === 'Document' ? 'o-layout__main__full-span document-field' : ''
  }, h(WrappedEditComponent, _extends({
    Component: EditLargeText,
    componentType: "large-text"
  }, props))),
  ViewComponent: ({
    value,
    id
  }) => h("section", {
    id: id,
    dangerouslySetInnerHTML: {
      __html: markdown(value)
    }
  })
};