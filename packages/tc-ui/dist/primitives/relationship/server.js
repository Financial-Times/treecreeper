"use strict";

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

const {
  h
} = require('preact');

const {
  getType
} = require('@financial-times/tc-schema-sdk');

const {
  WrappedEditComponent
} = require("../../components/edit-helpers");

const {
  RelationshipPicker
} = require("./lib/relationship-picker");

const {
  ViewRelationship,
  setRelationshipAnnotator
} = require("./lib/view-relationship");

module.exports = {
  ViewComponent: ViewRelationship,
  EditComponent: props => h(WrappedEditComponent, _extends({
    Component: RelationshipPicker,
    componentType: "relationship"
  }, props)),
  parser: value => value ? JSON.parse(value) : null,
  hasValue: (value, {
    hasMany
  }) => hasMany ? value && value.length : !!value,
  setRelationshipAnnotator,
  graphqlFragment: (propName, {
    type
  }) => {
    const typeDef = getType(type);
    const props = new Set(['code']);

    if (typeDef.properties.name) {
      props.add('name');
    }

    props.add(...Object.entries(typeDef.properties).filter(([, {
      useInSummary
    }]) => useInSummary).map(([name]) => name));
    return `${propName} {${[...props].join(' ')}}`;
  }
};