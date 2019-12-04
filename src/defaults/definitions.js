'use strict';

const lambdaNamespace = 'AWS/Lambda';
const APIGatewayNamespace = 'AWS/ApiGateway';
const SQSNamespace = 'AWS/SQS';

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
  functionAvailability: () => (functionName, serverless) => {
    const namingProvider = serverless.getProvider('aws').naming;
    const funRef = namingProvider.getLambdaLogicalId(functionName);

    return {
      omitDefaultDimension: true,
      metrics: [{
        Id: 'errors',
        MetricStat: {
          Metric: {
            MetricName: 'Errors',
            Namespace: lambdaNamespace,
            Dimensions: [{
              Name: 'FunctionName',
              Value: {
                Ref: funRef,
              }
            }],
          },
          Period: 60,
          Stat: 'Sum',
        },
        ReturnData: false,
      }, {
        Id: 'timeouts',
        MetricStat: {
          Metric: {
            MetricName: 'Timeouts',
            Namespace: lambdaNamespace,
            Dimensions: [{
              Name: 'FunctionName',
              Value: {
                Ref: funRef,
              }
            }],
          },
          Period: 60,
          Stat: 'Sum',
        },
        ReturnData: false,
      }, {
        Id: 'requests',
        MetricStat: {
          Metric: {
            MetricName: 'Invocations',
            Namespace: lambdaNamespace,
            Dimensions: [{
              Name: 'FunctionName',
              Value: {
                Ref: funRef,
              }
            }],
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
    };
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
  APIGatewayLatency: definitions => (functionName, serverless) => {
    const functionObj = serverless.service.getFunction(functionName);
    const httpEvent = functionObj.events.find(event => event.http);
    if (!httpEvent) {
      throw new Error('An http event is needed to set up the APIGatewayLatency alarm.');
    }

    const rawPath = httpEvent.http.path;
    const path = `${rawPath[0] !== '/' ? '/' : ''}${rawPath}`;

    return {
      omitDefaultDimension: true,
      description: 'APIGateway latency monitoring',
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
      ...definitions,
    };
  },
  APIGatewayAvailability: definitions => (functionName, serverless) => {
    const functionObj = serverless.service.getFunction(functionName);
    const httpEvent = functionObj.events.find(event => event.http);
    if (!httpEvent) {
      throw new Error('An http event is needed to set up the APIGatewayAvailability alarm.');
    }

    const rawPath = httpEvent.http.path;
    const path = `${rawPath[0] !== '/' ? '/' : ''}${rawPath}`;

    return {
      omitDefaultDimension: true,
      description: 'APIGateway availability monitoring',
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
      ...definitions,
    };
  },
  DLQMessageVisible: definitions => (functionName, serverless) => {
    const functionObj = serverless.service.getFunction(functionName);
    const dlqName = functionObj.alarmDLQName;
    if (!dlqName) {
      throw new Error('Alarm DLQ Name (alarmDLQName) is required.');
    }
    const dimensions = [{
      Name: "QueueName",
      Value: dlqName,
    }];
    return {
      omitDefaultDimension: true,
      namespace: SQSNamespace,
      description: 'Messages present in DLQ',
      metric: 'ApproximateNumberOfMessagesVisible',
      threshold: 1,
      statistic: 'Sum',
      dimensions,
      period: 60,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      comparisonOperator: 'GreaterThanOrEqualToThreshold',
      ...definitions,
    };
  },
};
