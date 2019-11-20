'use strict';

const lambdaNamespace = 'AWS/Lambda';
const APIGatewayNamespace = 'AWS/ApiGateway';

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
  functionAvailability: {
    omitDefaultDimension: true,
    metrics: [{
      Id: 'errors',
      MetricStat: {
        Metric: {
          MetricName: 'Executions',
          Namespace: lambdaNamespace,
        },
        Period: 60,
        Stat: 'Sum',
      },
      ReturnData: false,
    }, {
      Id: 'errors',
      MetricStat: {
        Metric: {
          MetricName: 'Timeouts',
          Namespace: lambdaNamespace,
        },
        Period: 60,
        Stat: 'Sum',
      },
      ReturnData: false,
    }, {
      Id: 'requests',
      MetricStat: {
        Metric: {
          MetricName: 'Count',
          Namespace: lambdaNamespace,
        },
        Period: 60,
        Stat: 'Sum',
      },
      ReturnData: false,
    }, {
      Id: 'expr',
      Expression: '((requests - errors - timeouts) / requests) * 100',
      Label: 'Availability',
    }],
    threshold: 99.9,
    evaluationPeriods: 1,
    comparisonOperator: 'LessThanThreshold'
  },
  functionDuration: {
    namespace: lambdaNamespace,
    metric: 'Duration',
    threshold: 2000,
    statistic: 'Average',
    period: 300,
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
  APIGatewayLatency: (functionObj, serverless) => {
    const httpEvent = functionObj.events.find(event => event.http);
    if (!httpEvent) {
      throw new Error('An http event is needed to set up the APIGatewayAvailability alarm.');
    }

    const rawPath = httpEvent.http.path;
    const path = `${rawPath[0] !== '/' ? '/' : ''}${rawPath}`;

    return {
      omitDefaultDimension: true,
      description: 'Messages present in DLQ',
      namespace: APIGatewayNamespace,
      metric: 'Latency',
      dimensions: [{
        Name: 'ApiName',
        Value: `${serverless.service.provider.environment.INSTITUTION}-apiv2`,
      }, {
        Name: 'Resource',
        Value: path,
      }, {
        Name: 'Method',
        Value: httpEvent.http.method.toUpperCase(),
      }, {
        Name: 'Stage',
        Value: serverless.processedInput.options.stage,
      }],
      threshold: 2000,
      statistic: 'Average',
      period: 300,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      comparisonOperator: 'GreaterThanOrEqualToThreshold',
    };
  },
  APIGatewayAvailability: (functionObj, serverless) => {
    const httpEvent = functionObj.events.find(event => event.http);
    if (!httpEvent) {
      throw new Error('An http event is needed to set up the APIGatewayAvailability alarm.');
    }

    const rawPath = httpEvent.http.path;
    const path = `${rawPath[0] !== '/' ? '/' : ''}${rawPath}`;

    return {
      omitDefaultDimension: true,
      metrics: [{
        Id: 'errors',
        MetricStat: {
          Metric: {
            Dimensions: [{
              Name: 'ApiName',
              Value: `${serverless.service.provider.environment.INSTITUTION}-apiv2`,
            }, {
              Name: 'Resource',
              Value: path,
            }, {
              Name: 'Method',
              Value: httpEvent.http.method.toUpperCase(),
            }, {
              Name: 'Stage',
              Value: serverless.processedInput.options.stage,
            }],
            MetricName: '5XXError',
            Namespace: APIGatewayNamespace,
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
              Value: `${serverless.service.provider.environment.INSTITUTION}-apiv2`,
            }, {
              Name: 'Resource',
              Value: path,
            }, {
              Name: 'Method',
              Value: httpEvent.http.method.toUpperCase(),
            }, {
              Name: 'Stage',
              Value: serverless.processedInput.options.stage,
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
        Expression: '((requests - errors) / requests) * 100',
        Label: 'Availability',
      }],
      threshold: 99.9,
      evaluationPeriods: 1,
      comparisonOperator: 'LessThanThreshold',
    };
  },
};
