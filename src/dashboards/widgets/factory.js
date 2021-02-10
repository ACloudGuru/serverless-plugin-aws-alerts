const widgets = {
  'api-gw': {
    latency: {
      numbers: require('./api-gw/latency/numbers'),
      'time-series': require('./api-gw/latency/time-series'),
    },
    requests: {
      numbers: require('./api-gw/requests/numbers'),
      'time-series': require('./api-gw/requests/time-series'),
    },
  },
  lambda: {
    duration: {
      numbers: require('./lambda/duration/numbers'),
      'time-series': require('./lambda/duration/time-series'),
    },
    errors: {
      numbers: require('./lambda/errors/numbers'),
      'time-series': require('./lambda/errors/time-series'),
    },
    invocations: {
      numbers: require('./lambda/invocations/numbers'),
      'time-series': require('./lambda/invocations/time-series'),
    },
    throttles: {
      numbers: require('./lambda/throttles/numbers'),
      'time-series': require('./lambda/throttles/time-series'),
    },
    iteratorage: {
      numbers: require('./lambda/iterator-age/numbers'),
      'time-series': require('./lambda/iterator-age/time-series'),
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
    throw new Error(
      `Invalid metric ${display} for service ${service} and metric ${metric}`
    );
  }

  return widget;
};

module.exports = {
  getWidget,
};
