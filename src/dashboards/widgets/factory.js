'use strict';

const widgets = {
  'api-gw': {
    latency: {
      'time-series': require('./api-gw/latency/time-series'),
    },
    requests: {
      'time-series': require('./api-gw/requests/time-series'),
    },
  },
  lambda: {
    duration: {
      'time-series': require('./lambda/duration/time-series'),
    },
    errors: {
      'numbers': require('./lambda/errors/numbers'),
      'time-series': require('./lambda/errors/time-series'),
    },
    invocations: {
      'numbers': require('./lambda/invocations/numbers'),
      'time-series': require('./lambda/invocations/time-series'),
    },
    throttles: {
      'numbers': require('./lambda/throttles/numbers'),
      'time-series': require('./lambda/throttles/time-series'),
    },
  },
};

const getWidget = (service, metric, display) => {
  const serviceWidgets = widgets[service];
  if (!serviceWidgets) {
    throw new Error(`Invalid service ${service}`);
  }

  const serviceMetricWidgets = serviceWidgets[metric];
  if (!serviceMetricWidgets) {
    throw new Error(`Invalid metric ${metric} for service ${service}`);
  }

  const widget = serviceMetricWidgets[display];
  if (!widget) {
    throw new Error(`Invalid metric ${display} for service ${service} and metric ${metric}`);
  }

  return widget;
};

module.exports = {
  getWidget,
};
