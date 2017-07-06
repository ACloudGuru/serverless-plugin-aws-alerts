'use strict';

const createWidget = (service, stage, region, functions, coordinates) => {
  const widget = {
    type: 'metric',
    x: coordinates.x,
    y: coordinates.y,
    width: coordinates.width,
    height: coordinates.height,
    properties: {
      title: 'Throttles',
      view: 'singleValue',
      metrics: [ ],
      region: region,
      period: 300
    }
  };

  widget.properties.metrics = functions.map(f => ([
    'AWS/Lambda',
    'Throttles',
    'FunctionName',
    `${service}-${stage}-${f.name}`,
    {
      stat: 'Sum',
      period: 2592000,
      region: region,
      label: f.name
    }
  ]));

  return widget;
};

module.exports = {
  createWidget,
};
