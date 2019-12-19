"use strict";

const {
  h,
  Fragment
} = require('preact');

const {
  getEnums
} = require('@financial-times/tc-schema-sdk');

const {
  FormError
} = require("../components/messages");

const {
  Concept,
  SectionHeader
} = require("../components/structure");

const {
  SaveButton,
  CancelButton
} = require("../components/buttons");

const getValue = (itemSchema, itemValue) => {
  // preserves boolean values to prevent false being coerced to empty string
  if (itemSchema.type === 'Boolean') {
    return typeof itemValue === 'boolean' ? itemValue : '';
  } // return relationships as type, code and name object


  if (itemSchema.relationship) {
    if (itemSchema.hasMany) {
      return itemValue ? itemValue.map(item => ({
        type: itemSchema.type,
        code: item.code,
        name: item.name || item.code
      })) : [];
    }

    return itemValue ? {
      type: itemSchema.type,
      code: itemValue.code,
      name: itemValue.name || itemValue.code
    } : null;
  } // everything else is just text


  return itemValue;
};

const PropertyInputs = ({
  fields,
  data,
  isEdit,
  type,
  assignComponent
}) => {
  const propertyfields = Object.entries(fields);
  const fieldsToLock = data._lockedFields ? JSON.parse(data._lockedFields) : {};
  const fieldNamesToLock = Object.keys(fieldsToLock).filter(fieldName => fieldsToLock[fieldName] !== 'biz-ops-admin');
  return propertyfields.filter(([, schema]) => // HACK: need to get rid of fields that are doing this
  !schema.label.includes('deprecated') && !schema.deprecationReason).map(([name, item]) => {
    let lockedBy;

    if (fieldNamesToLock.includes(name)) {
      lockedBy = fieldsToLock[name];
    }

    const {
      EditComponent
    } = assignComponent(item.type);
    const viewModel = {
      propertyName: name,
      value: getValue(item, data[name]),
      dataType: item.type,
      parentType: type,
      options: getEnums()[item.type] ? Object.keys(getEnums()[item.type]) : [],
      label: name.toUpperCase(),
      ...item,
      isEdit,
      lockedBy
    };
    return viewModel.propertyName && viewModel.label ? h(EditComponent, viewModel) : null;
  });
};

const EditForm = ({
  schema,
  data,
  isEdit,
  error,
  type,
  code,
  querystring,
  assignComponent
}) => {
  const getAction = () => {
    return isEdit ? `/${type}/${encodeURIComponent(code)}/edit` : `/${type}/create`;
  };

  return h(Fragment, null, h("form", {
    className: "o-layout__main o-forms",
    action: getAction(),
    method: "POST",
    autoComplete: "off"
  }, h("div", {
    className: "o-layout__main__full-span"
  }, h(FormError, {
    type: type,
    code: code || data.code,
    error: error
  }), h("div", {
    className: "o-layout-typography"
  }, h("h1", {
    id: "record-title",
    className: "record-title"
  }, type, ": ", data.name || data.code)), h(Concept, {
    name: schema.name,
    description: schema.description,
    moreInformation: schema.moreInformation
  }), h("div", {
    className: "biz-ops-cta-container--sticky o-layout__unstyled-element"
  }, h(SaveButton, {
    querystring: querystring || '',
    type: type,
    code: code
  }), h(CancelButton, {
    querystring: querystring || '',
    type: type,
    code: code
  })), Object.entries(schema.fieldsets).map(([name, {
    heading,
    properties
  }]) => h("fieldset", {
    className: `fieldset-biz-ops fieldset-${name}`
  }, h("div", {
    className: "o-layout-typography"
  }, h(SectionHeader, {
    title: heading
  })), h(PropertyInputs, {
    fields: properties,
    data: data,
    isEdit: isEdit,
    type: type,
    assignComponent: assignComponent
  }))), h("input", {
    name: "_lockedFields",
    type: "hidden",
    value: data._lockedFields
  }))), h("script", {
    src: "https://cloud.tinymce.com/stable/tinymce.js",
    defer: true
  }));
};

module.exports = EditForm;