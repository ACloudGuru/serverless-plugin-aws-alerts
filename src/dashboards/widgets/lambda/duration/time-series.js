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
      view: 'timeSeries',
      stacked: false,
      metrics: [ ],
      region: config.region,
      period: config.properties.metricsPeriod
    }
  };

  widget.properties.metrics = config.functions.reduce((accum, f) => {
    return accum.concat([
      [
        'AWS/Lambda',
        'Duration',
        'FunctionName',
        `${config.service}-${config.stage}-${f.name}`,
        {
          stat: 'p50',
          period: config.properties.metricsPeriod,
          region: config.region,
          label: `${f.name} p50`,
        }
      ],[
        'AWS/Lambda',
        'Duration',
        'FunctionName',
        `${config.service}-${config.stage}-${f.name}`,
        {
          stat: 'p90',
          period: config.properties.metricsPeriod,
          region: config.region,
          label: `${f.name} p90`,
        }
      ]
    ]);
  }, []);

  return widget;
};

module.exports = {
  createWidget,
};
