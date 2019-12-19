"use strict";

const {
  h
} = require('preact');

const InnerMessage = ({
  message,
  type,
  isInner = false
}) => h("section", {
  className: `o-message o-message${isInner ? '--inner' : ''} o-message--alert o-message--${type}`,
  "data-o-component": "o-message"
}, h("div", {
  className: "o-message__container"
}, h("div", {
  className: "o-message__content"
}, h("p", {
  className: "o-message__content-main"
}, message))));

const Message = ({
  message,
  isBanner = false,
  messageType = 'inform',
  isInner
}) => {
  const inner = h(InnerMessage, {
    message: message,
    type: messageType,
    isInner: isInner
  });
  return isBanner ? h("div", {
    className: "o-message--success"
  }, inner) : inner;
};

const FormError = props => {
  if (props.error) {
    return h("div", {
      className: "o-message o-message--inner o-message--alert o-message--error biz-ops-alert",
      "data-o-component": "o-message"
    }, h("div", {
      className: "o-message__container"
    }, h("div", {
      className: "o-message__content"
    }, h("p", {
      className: "o-message__content-main"
    }, h("span", {
      className: "o-message__content-highlight"
    }, "Oops."), h("span", {
      className: "o-message__content-detail"
    }, ` Could not ${props.error.action} ${props.type} record for ${props.code}.`)), h("p", {
      className: "o-message__content-additional"
    }, `${props.error.message}`))));
  }
};

module.exports = {
  Message,
  FormError
};