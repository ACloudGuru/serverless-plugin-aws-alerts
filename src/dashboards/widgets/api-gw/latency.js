'use strict';

const createWidget = (service, stage, region, coordinates) => {
  const apiName = `${stage}-${service}`;

  const widget = {
    type: 'metric',
    x: coordinates.x,
    y: coordinates.y,
    width: coordinates.width,
    height: coordinates.height,
    properties: {
      title: 'API Requests',
      view: 'timeSeries',
      stacked: false,
      metrics: [
          [ 'AWS/ApiGateway', '5XXError', 'ApiName', apiName, { stat: 'Sum', period: 900 } ],
          [ 'AWS/ApiGateway', '4XXError', 'ApiName', apiName, { stat: 'Sum', period: 900 } ],
          [ 'AWS/ApiGateway', 'Count', 'ApiName', apiName, { stat: 'Sum', period: 900 } ]
      ],
      region: region,
    }
  };

  return widget;
};

module.exports = {
  createWidget,
};
