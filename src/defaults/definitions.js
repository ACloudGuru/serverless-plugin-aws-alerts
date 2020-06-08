'use strict';

const lambdaNamespace = 'AWS/Lambda';

module.exports = {
  functionInvocations: {
    namespace: lambdaNamespace,
    enabled: true,
    type: 'static',
    metric: 'Invocations',
    threshold: 100,
    statistic: 'Sum',
    period: 60,
    evaluationPeriods: 1,
    datapointsToAlarm: 1,
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
  },
  functionErrors: {
    namespace: lambdaNamespace,
    enabled: true,
    type: 'static',
    metric: 'Errors',
    threshold: 1,
    statistic: 'Sum',
    period: 60,
    evaluationPeriods: 1,
    datapointsToAlarm: 1,
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
  },
  functionDuration: {
    namespace: lambdaNamespace,
    enabled: true,
    type: 'static',
    metric: 'Duration',
    threshold: 500,
    statistic: 'Average',
    period: 60,
    evaluationPeriods: 1,
    datapointsToAlarm: 1,
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
  },
  functionThrottles: {
    namespace: lambdaNamespace,
    enabled: true,
    type: 'static',
    metric: 'Throttles',
    threshold: 1,
    statistic: 'Sum',
    period: 60,
    evaluationPeriods: 1,
    datapointsToAlarm: 1,
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
  }
};
