'use strict';

const createWidget = (service, stage, region, functions, coordinates) => {
  const widget = {
    type: 'metric',
    x: coordinates.x,
    y: coordinates.y,
    width: coordinates.width,
    height: coordinates.height,
    properties: {
      view: 'timeSeries',
      stacked: false,
      metrics: [ ],
      region: region,
      title: 'Invocations',
      period: 300
    }
  };

  widget.properties.metrics = functions.map(f => ([
    'AWS/Lambda',
    'Invocations',
    'FunctionName',
    `${service}-${stage}-${f.name}`,
    {
      stat: 'Sum',
      period: 900,
      region: region,
      label: f.name
    }
  ]));

  return widget;
};

module.exports = {
  createWidget,
};
