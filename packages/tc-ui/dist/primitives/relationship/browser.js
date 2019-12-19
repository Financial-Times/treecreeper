"use strict";

require("./main.css");

const {
  render,
  h
} = require('preact');

const {
  RelationshipPicker
} = require("./lib/relationship-picker.jsx");

module.exports = {
  withEditComponent: container => render(h(RelationshipPicker, JSON.parse(container.dataset.props)), document, container)
};