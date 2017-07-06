'use strict';

const apiGwLatency = require('./widgets/api-gw/latency');
const apiGwRequests = require('./widgets/api-gw/requests');

const lambdaDurationTimeSeriesWidget = require('./widgets/lambda/duration/time-series');

const lambdaErrorsNumbersWidget = require('./widgets/lambda/errors/numbers');
const lambdaErrorsTimeSeriesWidget = require('./widgets/lambda/errors/time-series');

const lambdaInvocationsNumbersWidget = require('./widgets/lambda/invocations/numbers');
const lambdaInvocationsTimeSeriesWidget = require('./widgets/lambda/invocations/time-series');

const lambdaThrottlesNumbersWidget = require('./widgets/lambda/throttles/numbers');
const lambdaThrottlesTimeSeriesWidget = require('./widgets/lambda/throttles/time-series');

const createDashboard = (service, stage, region, functions) => {
  const widgets = [
    lambdaErrorsTimeSeriesWidget.createWidget(service, stage, region, functions, {
        x: 0,
        y: 0,
        width: 6,
        height: 6,
    }),
    lambdaErrorsNumbersWidget.createWidget(service, stage, region, functions, {
        x: 6,
        y: 0,
        width: 6,
        height: 6,
    }),
    lambdaInvocationsTimeSeriesWidget.createWidget(service, stage, region, functions, {
        x: 0,
        y: 6,
        width: 6,
        height: 6,
    }),
    lambdaInvocationsNumbersWidget.createWidget(service, stage, region, functions, {
        x: 6,
        y: 6,
        width: 6,
        height: 6,
    }),
    lambdaDurationTimeSeriesWidget.createWidget(service, stage, region, functions, {
        x: 12,
        y: 0,
        width: 12,
        height: 6,
    }),
    apiGwLatency.createWidget(service, stage, region, {
        x: 12,
        y: 0,
        width: 12,
        height: 6,
    }),
    apiGwRequests.createWidget(service, stage, region, {
        x: 12,
        y: 6,
        width: 12,
        height: 6,
    }),
    lambdaThrottlesNumbersWidget.createWidget(service, stage, region, functions, {
        x: 0,
        y: 12,
        width: 6,
        height: 6,
    }),
    lambdaThrottlesTimeSeriesWidget.createWidget(service, stage, region, functions, {
        x: 6,
        y: 12,
        width: 6,
        height: 6,
    }),
  ]

  return { widgets };
};

module.exports = {
  createDashboard,
};
