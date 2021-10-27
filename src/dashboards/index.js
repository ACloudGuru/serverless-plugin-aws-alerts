const widgetFactory = require('./widgets/factory');

const dashboards = {
  default: require('./configs/default.json'),
  vertical: require('./configs/vertical.json'),
};

const createDashboard = (service, stage, region, functions, name) => {
  const dashboard = dashboards[name];

  if (!dashboard) {
    throw new Error(`Cannot find dashboard by name ${name}`);
  }

  const widgets = dashboard.widgets.map((w) => {
    const widget = widgetFactory.getWidget(w.service, w.metric, w.display);
    const config = {
      service,
      stage,
      region,
      coordinates: w.coordinates,
      title: w.title,
      functions,
    };

    return widget.createWidget(config);
  });

  return { widgets };
};

module.exports = {
  createDashboard,
};
