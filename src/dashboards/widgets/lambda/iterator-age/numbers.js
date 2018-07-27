'use strict';

const createWidget = (config) => {
  const widget = {
    type: 'metric',
    x: config.coordinates.x,
    y: config.coordinates.y,
    width: config.coordinates.width,
    height: config.coordinates.height,
    properties: {
      title: config.title,
      view: 'singleValue',
      metrics: [ ],
      region: config.region,
      period: config.properties.metricsPeriod
    }
  };

  widget.properties.metrics = config.functions.map(f => ([
    'AWS/Lambda',
    'IteratorAge',
    'FunctionName',
    `${config.service}-${config.stage}-${f.name}`,
    {
      stat: 'Average',
      period: config.properties.metricsPeriod,
      region: config.region,
      label: f.name
    }
  ]));

  return widget;
};

module.exports = {
  createWidget,
};
