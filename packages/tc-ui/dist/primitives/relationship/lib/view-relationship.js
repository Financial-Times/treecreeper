"use strict";

const {
  h,
  Fragment
} = require('preact');

const {
  getType
} = require('@financial-times/tc-schema-sdk');

const {
  LinkToRecord
} = require("../../../components/helpers");

let RelationshipAnnotator;

const OneRelationship = ({
  type,
  value = {},
  id
}) => type && value.code ? h(Fragment, null, h(LinkToRecord, {
  id: id,
  type: type,
  value: value
}), RelationshipAnnotator ? h(RelationshipAnnotator, {
  value: value,
  type: type
}) : null) : 'Error: unable to construct link';

const ViewRelationship = ({
  value,
  type,
  id,
  hasMany
}) => {
  if (!hasMany) {
    const props = {
      type,
      value,
      id
    };
    return h(OneRelationship, props);
  }

  const schema = getType(type);

  const inactiveCheck = datum => {
    if (schema.inactiveRule) {
      return Object.entries(schema.inactiveRule).every(([prop, expectedValue]) => datum[prop] === expectedValue);
    }

    return datum.isActive === false;
  };

  return Array.isArray(value) ? h("ul", {
    id: id,
    className: "o-layout__unstyled-element biz-ops-links"
  }, value.map(item => {
    const props = {
      type,
      value: item
    };
    return h("li", {
      className: inactiveCheck(item) ? 'inactive' : 'active'
    }, h(OneRelationship, props));
  })) : 'Error: unable to construct links';
};

module.exports = {
  ViewRelationship,
  setRelationshipAnnotator: component => {
    RelationshipAnnotator = component;
  }
};