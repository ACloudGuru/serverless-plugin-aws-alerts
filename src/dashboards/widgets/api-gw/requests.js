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
          [ 'AWS/ApiGateway', 'IntegrationLatency', 'ApiName', apiName, { stat: 'p50', period: 900, region: region } ],
          [ 'AWS/ApiGateway', 'Latency', 'ApiName', apiName, { stat: 'p50', period: 900, region: region } ],
          [ 'AWS/ApiGateway', 'IntegrationLatency', 'ApiName', apiName, { stat: 'p90', period: 900, region: region } ],
          [ 'AWS/ApiGateway', 'Latency', 'ApiName', apiName, { stat: 'p90', period: 900, region: region } ]
      ],
      region: region,
    }
  };

  return widget;
};

module.exports = {
  createWidget,
};
