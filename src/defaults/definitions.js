'use strict';

const lambdaNamespace = 'AWS/Lambda';
const APIGatewayNamespace = 'AWS/ApiGateway';
const SQSNamespace = 'AWS/SQS';
const S3Namespace = 'AWS/S3';

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
    const httpEvents = functionObj.events.filter(event => event.http);
    if (!httpEvents.length) {
      throw new Error('An http event is needed to set up the APIGatewayLatency alarm.');
    }

    return httpEvents.map((httpEvent) => {
      const rawPath = httpEvent.http.path;
      const path = `${rawPath[0] !== '/' ? '/' : ''}${rawPath}`;

      return {
        nameSuffix: rawPath.replace(/\W/g, ''), // This is so we can distinguish each path alarm for the same lambda
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
    });
  },
  APIGatewayAvailability: definitions => (functionName, serverless) => {
    const functionObj = serverless.service.getFunction(functionName);
    const httpEvents = functionObj.events.filter(event => event.http);
    if (!httpEvents.length) {
      throw new Error('An http event is needed to set up the APIGatewayAvailability alarm.');
    }

    return httpEvents.map((httpEvent) => {
      const rawPath = httpEvent.http.path;
      const path = `${rawPath[0] !== '/' ? '/' : ''}${rawPath}`;

      return {
        nameSuffix: rawPath.replace(/\W/g, ''), // This is so we can distinguish each path alarm for the same lambda
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
    });
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
  NumberOfObjectsInBucket: definitions => (functionName, serverless) => {
    const functionObj = serverless.service.getFunction(functionName);
    const bucketName = functionObj.alarmBucketName;
    const threshold = functionObj.alarmBucketObjectsThreshold || 100000;

    const dimensions = [{
      Name: 'BucketName',
      Value: bucketName
    }]

    return {
      omitDefaultDimension: true,
      namespace: S3Namespace,
      description: 'Objects present in the bucket',
      metric: 'NumberOfObjects',
      threshold,
      statistic: 'Sum',
      dimensions,
      period: 3600,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      comparisonOperator: 'GreaterThanOrEqualToThreshold',
      ...definitions,
    };
  }
};
