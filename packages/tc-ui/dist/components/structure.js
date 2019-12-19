"use strict";

const {
  h,
  Fragment
} = require('preact');

const toKebabCase = string => string.split(' ').map(str => str.toLowerCase()).join('-');

const Concept = ({
  name,
  description,
  moreInformation
}) => h("aside", {
  className: "biz-ops-aside",
  title: "Concept"
}, h("div", {
  className: "o-forms-title"
}, h("div", {
  className: "o-forms-title__main"
}, "A ", name, " is:"), h("div", {
  className: "description-text o-forms-title__prompt"
}, description, h("p", null), moreInformation))); // Has a title, and there are other ways to edit content
// TODO: Need to work with origami and design to find a
// more accessible solution that means we won't need to
// disable the linting


const SectionHeader = ({
  title,
  code,
  type,
  includeEditLink = false
}) => h(Fragment, null, title ? h("h2", {
  id: toKebabCase(title),
  className: "section-heading"
}, title, includeEditLink && code && type ? h(Fragment, null, h("a", {
  // eslint-disable-line jsx-a11y/anchor-has-content
  className: "o-icons-icon o-icons-icon--edit biz-ops-section-header__edit-link o-layout__unstyled-element",
  href: `/${type}/${code}/edit?#${toKebabCase(title)}`,
  title: "Edit this section"
})) : null) : h("h2", null, "no title provided"));

const blockComponents = ['Document'];

const layoutClass = type => blockComponents.includes(type) ? 'block' : 'inline';

const LabelledPrimitive = props => {
  const {
    label,
    showInactive,
    description,
    value,
    type,
    useInSummary,
    id,
    ViewComponent,
    hasValue
  } = props;

  if (!useInSummary && !hasValue(value, props)) {
    return null;
  }

  return h(Fragment, null, h("dt", {
    id: `tooltip-${id}`,
    className: `${layoutClass(type)} tooltip-container`
  }, label, h("span", {
    className: `tooltip-target-${id} biz-ops-help`,
    id: `tooltip-target-${id}`
  }, h("i", {
    "aria-label": `help for ${id}`,
    className: "o-icons-icon o-icons-icon--info biz-ops-help-icon"
  })), h("div", {
    "data-o-component": "o-tooltip",
    "data-o-tooltip-position": "below",
    "data-o-tooltip-target": `tooltip-target-${id}`,
    "data-o-tooltip-show-on-click": "true" // data-o-tooltip-show-on-hover="true"

  }, h("div", {
    className: "o-tooltip-content"
  }, description))), h("dd", {
    className: `${layoutClass(type)} ${showInactive === false ? 'hide-inactive' : ''}`
  }, h(ViewComponent, props), showInactive === false ? h("button", {
    type: "button",
    className: "o-buttons show-inactive-button"
  }, "show inactive records") : null));
};

const lastActorLink = (user, system) => user ? h("a", {
  href: `/Person/${user}`
}, user) : h("a", {
  href: `/System/${system}`
}, system);

const MetaProperties = ({
  data,
  isCreate
}) => {
  const timestamp = isCreate ? data._createdTimestamp.formatted : data._updatedTimestamp.formatted;
  const user = isCreate ? data._createdByUser : data._updatedByUser;
  const client = isCreate ? data._createdByClient : data._updatedByClient;
  return h(Fragment, null, isCreate ? 'Created by ' : 'Last updated by ', lastActorLink(user, client), ",", ' ', h("time", {
    "data-o-component": "o-date",
    className: "o-date meta-timestamp",
    dateTime: timestamp
  }));
};

module.exports = {
  Concept,
  SectionHeader,
  LabelledPrimitive,
  MetaProperties
};