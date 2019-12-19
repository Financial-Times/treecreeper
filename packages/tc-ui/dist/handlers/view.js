"use strict";

const template = require("../templates/view-page");

const getViewHandler = ({
  getApiClient,
  getSchemaSubset,
  handleError,
  renderPage,
  Subheader,
  assignComponent
}) => {
  const render = async event => {
    const {
      type,
      code,
      error
    } = event;
    const apiClient = getApiClient(event);
    const data = await apiClient.read(type, code);
    return renderPage(template, { ...getSchemaSubset(event, type),
      data,
      Subheader,
      error,
      assignComponent,
      pageType: 'view',
      pageTitle: `View ${type} ${data.name}`
    }, event);
  };

  return {
    handler: handleError(render),
    render
  };
};

module.exports = {
  getViewHandler
};