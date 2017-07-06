'use strict';

const createWidget = (service, stage, region, functions, coordinates) => {
  const widget = {
    type: 'metric',
    x: coordinates.x,
    y: coordinates.y,
    width: coordinates.width,
    height: coordinates.height,
    properties: {
      title: 'Duration',
      view: 'timeSeries',
      stacked: false,
      metrics: [ ],
      region: region,
      period: 300
    }
  };

  widget.properties.metrics = functions.reduce((accum, f) => {
    return accum.concat([
      [
        'AWS/Lambda',
        'Duration',
        'FunctionName',
        `${service}-${stage}-${f.name}`,
        {
          stat: 'p50',
          period: 900,
          region: region,
          label: `f.name p50`,
        }
      ],[
        'AWS/Lambda',
        'Duration',
        'FunctionName',
        `${service}-${stage}-${f.name}`,
        {
          stat: 'p90',
          period: 900,
          region: region,
          label: `f.name p90`,
        }
      ]
    ]);
  }, []);

  return widget;
};

module.exports = {
  createWidget,
};
