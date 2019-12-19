"use strict";

const {
  h
} = require('preact');

const {
  FormError
} = require("../components/messages");

const {
  Concept,
  LabelledPrimitive,
  SectionHeader,
  MetaProperties
} = require("../components/structure");

const {
  EditButton,
  DeleteButton
} = require("../components/buttons");

const Properties = ({
  fields,
  data,
  assignComponent
}) => {
  const propertyfields = Object.entries(fields);
  return propertyfields.filter(([, schema]) => !schema.label.includes('deprecated') && !schema.deprecationReason).map(([name, item]) => {
    const viewModel = {
      value: data[name],
      id: name,
      ...item,
      ...assignComponent(item.type)
    };
    return viewModel.label ? h(LabelledPrimitive, viewModel) : null;
  });
};

const View = props => {
  const {
    schema,
    data,
    error,
    querystring,
    assignComponent,
    Subheader = () => null
  } = props;
  return h("main", {
    className: "o-layout__main"
  }, h("div", {
    className: "o-layout__main__full-span"
  }, h(FormError, {
    type: schema.name,
    code: data.code,
    error: error
  }), h("div", {
    className: "o-layout-typography"
  }, h("h1", {
    id: "record-title",
    className: "record-title"
  }, schema.name, ": ", data.name || data.code), h("div", {
    "data-o-component": "o-expander",
    className: "o-expander",
    "data-o-expander-shrink-to": "hidden",
    "data-o-expander-collapsed-toggle-text": `Show the definition of "${schema.name}"`,
    "data-o-expander-expanded-toggle-text": "Hide definition"
  }, h("button", {
    className: "o-expander__toggle o--if-js",
    type: "button"
  }), h("div", {
    className: "o-expander__content"
  }, h(Concept, {
    name: schema.type,
    description: schema.description,
    moreInformation: schema.moreInformation
  }))), h(Subheader, props)), h("div", {
    className: "biz-ops-cta-container--sticky"
  }, h(EditButton, {
    type: schema.type,
    code: data.code,
    querystring: querystring || ''
  }), h(DeleteButton, {
    type: schema.type,
    code: data.code,
    querystring: querystring || ''
  })), h("div", {
    className: "o-layout-typography"
  }, Object.entries(schema.fieldsets).map(([name, {
    heading,
    properties
  }]) => h("section", {
    className: `fieldset-biz-ops fieldset-${name}`
  }, h(SectionHeader, {
    type: schema.type,
    code: data.code,
    title: heading,
    includeEditLink: true
  }), h("dl", {
    className: "biz-ops-properties-list"
  }, h(Properties, {
    fields: properties,
    data: data,
    assignComponent: assignComponent
  })))), h("p", null, h(MetaProperties, {
    data: data,
    isCreate: true
  }), ".", h(MetaProperties, {
    data: data,
    isCreate: false
  })))));
};

module.exports = View;