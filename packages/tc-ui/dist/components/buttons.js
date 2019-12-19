"use strict";

const {
  h
} = require('preact');

const coreClasses = 'o-buttons o-buttons--big biz-ops-cta';

const getButtonClasses = extraClasses => extraClasses ? `${coreClasses} ${extraClasses}` : coreClasses;

const EditButton = props => h("a", {
  href: `/${props.type}/${encodeURIComponent(props.code)}/edit?${props.querystring}`,
  className: getButtonClasses('o-buttons--primary o-buttons--mono biz-ops-cta--link-style-override')
}, "Edit");

const SaveButton = () => h("button", {
  className: getButtonClasses('o-buttons--primary o-buttons--mono'),
  type: "submit"
}, "Save");

const CancelButton = props => {
  const redirectLocation = props.type && props.code ? `/${props.type}/${encodeURIComponent(props.code)}?${props.querystring}` : `/create`;
  return h("a", {
    href: redirectLocation,
    className: getButtonClasses('o-buttons--mono biz-ops-cta--link-style-override')
  }, "Cancel");
};

const DeleteButton = props => props.isSubset ? null : h("form", {
  action: `/${props.type}/${encodeURIComponent(props.code)}/delete`,
  className: "biz-ops-cta",
  method: "POST"
}, h("button", {
  className: getButtonClasses('o-buttons--mono biz-ops-cta--delete'),
  type: "submit"
}, "Delete"));

module.exports = {
  EditButton,
  SaveButton,
  CancelButton,
  DeleteButton
};