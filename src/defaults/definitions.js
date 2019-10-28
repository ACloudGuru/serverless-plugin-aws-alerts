'use strict';

const lambdaNamespace = 'AWS/Lambda';

module.exports = {
  functionInvocations: {
    namespace: lambdaNamespace,
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
    metric: 'Throttles',
    threshold: 1,
    statistic: 'Sum',
    period: 60,
    evaluationPeriods: 1,
    datapointsToAlarm: 1,
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
  },
  functionTimeouts: {
    namespace: lambdaNamespace,
    metric: 'Timeouts',
    threshold: 1,
    statistic: 'Sum',
    period: 60,
    evaluationPeriods: 1,
    datapointsToAlarm: 1,
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
    pattern: 'Task timed out after'
  },
  APIGatewayAvailability: (functionObj) => {
    const httpEvent = functionObj.events.find(event => event.http);
    if (!httpEvent) {
      throw new Error('An http event is needed to set up the APIGatewayAvailability alarm.');
    }

    return {
      omitDefaultDimension: true,
      metrics: [{
        Id: 'errors',
        MetricStat: {
          Metric: {
            Dimensions: [{
              Name: 'ApiName',
              Value: '<%= INSTITUTION %>-apiv2'
            }, {
              Name: 'Resource',
              Value: httpEvent.http.path,
            }, {
              Name: 'Method',
              Value: httpEvent.http.method,
            }, {
              Name: 'Stage',
              Value: '${opt:stage}'
            }],
            MetricName: '5XXError',
            Namespace: 'AWS/ApiGateway',
          },
          Period: 60,
          Stat: 'Sum',
        },
        ReturnData: false,
      }, {
        Id: 'requests',
        MetricStat: {
          Metric: {
            Dimensions: [{
              Name: 'ApiName',
              Value: '<%= INSTITUTION %>-apiv2'
            }, {
              Name: 'Resource',
              Value: httpEvent.http.path,
            }, {
              Name: 'Method',
              Value: httpEvent.http.method,
            }, {
              Name: 'Stage',
              Value: '${opt:stage}'
            }],
            MetricName: 'Count',
            Namespace: 'AWS/ApiGateway',
          },
          Period: 60,
          Stat: 'Sum',
        },
        ReturnData: false,
      }, {
        Id: 'expr',
        Expression: '(requests - errors) / requests',
        Label: 'Availability',
      }],
      threshold: 99.99,
      evaluationPeriods: 1,
      comparisonOperator: 'LessThanThreshold'
    };
  },
};
