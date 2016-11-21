# generator-serverless-service [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url] [![Coverage percentage][coveralls-image]][coveralls-url]
> Serverless AWS Alerts Plugin

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
    topics:
      ok: ${self:service}-${opt:stage}-alerts-ok
      alarm: ${self:service}-${opt:stage}-alerts-alarm
      insufficientData: ${self:service}-${opt:stage}-alerts-insufficientData
    definitions:  # these defaults are merged with your definitions
      functionErrors:
        period: 300 # override period
      customAlarm:
        namespace: 'AWS/Lambda'
        metric: duration
        threshold: 200
        statistic: average
        period: 300
    global:
      - functionThrottles
      - functionErrors
    function:
      - functionInvocations
      - functionDuration

plugins:
  - serverless-plugin-aws-alerts


functions:
  foo:
    handler: foo.handler
    alarms: # merged with function alarms
      - customAlarm
      - name: fooAlarm
        metric: errors # define custom metrics here
        threshold: 1
        statistic: minimum
        period: 60
        evaluationPeriods: 1
```

## Default definitions
The plugin provides some default definitions that you can simply drop into your application. For example:

```yaml
  alerts:
    global:
      - functionThrottles
      - functionErrors
    function:
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
    comparisonOperator: GreaterThanThreshold
  functionErrors:
    namespace: 'AWS/Lambda'
    metric: Errors
    threshold: 10
    statistic: Maximum
    period: 60
    evaluationPeriods: 1
    comparisonOperator: GreaterThanThreshold
  functionDuration:
    namespace: 'AWS/Lambda'
    metric: Duration
    threshold: 500
    statistic: Maximum
    period: 60
    evaluationPeriods: 1
    comparisonOperator: GreaterThanThreshold
  functionThrottles:
    namespace: 'AWS/Lambda'
    metric: Throttles
    threshold: 50
    statistic: Sum
    period: 60
    evaluationPeriods: 1
    comparisonOperator: GreaterThanThreshold
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