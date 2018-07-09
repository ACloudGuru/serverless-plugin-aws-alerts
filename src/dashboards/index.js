'use strict';
const _ = require('lodash');

const widgetFactory = require('./widgets/factory');

const dashboards = {
  'default': require('./configs/default'),
  'vertical': require('./configs/vertical'),
};

const defaultProperties = require('./configs/properties');

const getProperties = (config) => {
  return _.merge({}, defaultProperties, config);
}

const createDashboard = (service, stage, region, functions, name, properties) => {
  const dashboard = dashboards[name];

  if (!dashboard) {
    throw new Error(`Cannot find dashboard by name ${name}`);
  }

  const mergedProperties = getProperties(properties)

  console.log("MERGED PROPERTIES",mergedProperties);

  const widgets = dashboard.widgets.map((w) => {
    const widget = widgetFactory.getWidget(w.service, w.metric, w.display);
    const config = {
      service,
      stage,
      region,
      coordinates: w.coordinates,
      title: w.title,
      functions,
      properties:mergedProperties
    };

    return widget.createWidget(config);
  });

  return { widgets };
};

module.exports = {
  createDashboard,
};
