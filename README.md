# Serverless AWS Alerts Plugin
  [![NPM version][npm-image]][npm-url]
  [![Build Status][travis-image]][travis-url]
  [![Dependency Status][daviddm-image]][daviddm-url]
  [![Coverage percentage][coveralls-image]][coveralls-url]

A Serverless plugin to easily add CloudWatch alarms to functions

## Installation
`npm i serverless-plugin-aws-alerts`

## Usage

```yaml
service: your-service
provider:
  name: aws
  runtime: nodejs4.3

custom:
  alerts:
    stages: # Optionally - select which stages to deploy alarms to
      - producton
      - staging

    dashboards: true

    topics:
      ok: ${self:service}-${opt:stage}-alerts-ok
      alarm: ${self:service}-${opt:stage}-alerts-alarm
      insufficientData: ${self:service}-${opt:stage}-alerts-insufficientData
    definitions:  # these defaults are merged with your definitions
      functionErrors:
        period: 300 # override period
      customAlarm:
        description: 'My custom alarm'
        namespace: 'AWS/Lambda'
        metric: duration
        threshold: 200
        statistic: Average
        period: 300
        evaluationPeriods: 1
        comparisonOperator: GreaterThanOrEqualToThreshold
    alarms:
      - functionThrottles
      - functionErrors
      - functionInvocations
      - functionDuration

plugins:
  - serverless-plugin-aws-alerts

functions:
  foo:
    handler: foo.handler
    alarms: # merged with function alarms
      - customAlarm
      - name: fooAlarm # creates new alarm or overwrites some properties of the alarm (with the same name) from definitions
        namespace: 'AWS/Lambda'
        metric: errors # define custom metrics here
        threshold: 1
        statistic: Minimum
        period: 60
        evaluationPeriods: 1
        comparisonOperator: GreaterThanOrEqualToThreshold
```

## SNS Topics

If topic name is specified, plugin assumes that topic does not exist and will create it. To use existing topics, specify ARNs instead.

## SNS Notifications

You can configure subscriptions to your SNS topics within your `serverless.yml`. For each subscription, you'll need to specify a `protocol` and an `endpoint`.

The following example will send email notifications to `me@example.com` for all messages to the Alarm topic:

```yaml
custom:
  alerts:
    topics:
      alarm:
        topic: ${self:service}-${opt:stage}-alerts-alarm
        notifications:
          - protocol: email
            endpoint: me@example.com
```

You can configure notifications to send to webhook URLs, to SMS devices, to other Lambda functions, and more. Check out the AWS docs [here](http://docs.aws.amazon.com/sns/latest/api/API_Subscribe.html) for configuration options.

## Metric Log Filters
You can monitor a log group for a function for a specific pattern. Do this by adding the pattern key.
You can learn about custom patterns at: http://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html

The following would create a custom metric log filter based alarm named `barAlarm`. Any function that included this alarm would have its logs scanned for the pattern `exception Bar` and if found would trigger an alarm.

```yaml
custom:
  alerts:
    function:
      - name: barAlarm
        metric: barExceptions
        threshold: 0
        statistic: Minimum
        period: 60
        evaluationPeriods: 1
        comparisonOperator: GreaterThanThreshold
        pattern: 'exception Bar'
      - name: bunyanErrors
        metric: BunyanErrors
        threshold: 0
        statistic: Sum
        period: 60
        evaluationPeriods: 1
        comparisonOperator: GreaterThanThreshold
        pattern: '{$.level > 40}'
```

> Note: For custom log metrics, namespace property will automatically be set to stack name (e.g. `fooservice-dev`).

## Default Definitions
The plugin provides some default definitions that you can simply drop into your application. For example:

```yaml
alerts:
  alerts:
    - functionErrors
    - functionThrottles
    - functionInvocations
    - functionDuration
```

If these definitions do not quite suit i.e. the threshold is too high, you can override a setting without
creating a completely new definition.

```yaml
alerts:
  definitions:  # these defaults are merged with your definitions
    functionErrors:
      period: 300 # override period
      treatMissingData: notBreaching # override treatMissingData
```

The default definitions are below.

```yaml
definitions:
  functionInvocations:
    namespace: 'AWS/Lambda'
    metric: Invocations
    threshold: 100
    statistic: Sum
    period: 60
    evaluationPeriods: 1
    comparisonOperator: GreaterThanOrEqualToThreshold
    treatMissingData: missing
  functionErrors:
    namespace: 'AWS/Lambda'
    metric: Errors
    threshold: 1
    statistic: Maximum
    period: 60
    evaluationPeriods: 1
    comparisonOperator: GreaterThanOrEqualToThreshold
    treatMissingData: missing
  functionDuration:
    namespace: 'AWS/Lambda'
    metric: Duration
    threshold: 500
    statistic: Maximum
    period: 60
    evaluationPeriods: 1
    comparisonOperator: GreaterThanOrEqualToThreshold
    treatMissingData: missing
  functionThrottles:
    namespace: 'AWS/Lambda'
    metric: Throttles
    threshold: 1
    statistic: Sum
    period: 60
    evaluationPeriods: 1
    comparisonOperator: GreaterThanOrEqualToThreshold
    treatMissingData: missing
```

## Using Percentile Statistic for a Metric

Statistic not only supports SampleCount, Average, Sum, Minimum or Maximum as defined in CloudFormation [here](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-cw-alarm.html#cfn-cloudwatch-alarms-statistic), but also percentiles. This is possible by leveraging  [ExtendedStatistic](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-cw-alarm.html#cfn-cloudwatch-alarms-extendedstatistic) under the hood. This plugin will automatically choose the correct key for you. See an example below:

```yaml
definitions:
  functionDuration:
    namespace: 'AWS/Lambda'
    metric: Duration
    threshold: 100
    statistic: 'p95'
    period: 60
    evaluationPeriods: 1
    comparisonOperator: GreaterThanThreshold
    treatMissingData: missing
```

## License

MIT © [A Cloud Guru](https://acloud.guru/)


[npm-image]: https://badge.fury.io/js/serverless-plugin-aws-alerts.svg
[npm-url]: https://npmjs.org/package/serverless-plugin-aws-alerts
[travis-image]: https://travis-ci.org/ACloudGuru/serverless-plugin-aws-alerts.svg?branch=master
[travis-url]: https://travis-ci.org/ACloudGuru/serverless-plugin-aws-alerts
[daviddm-image]: https://david-dm.org/ACloudGuru/serverless-plugin-aws-alerts.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/ACloudGuru/serverless-plugin-aws-alerts
[coveralls-image]: https://coveralls.io/repos/ACloudGuru/serverless-plugin-aws-alerts/badge.svg
[coveralls-url]: https://coveralls.io/r/ACloudGuru/serverless-plugin-aws-alerts
