# Serverless AWS Alerts Plugin [![Build Status](https://travis-ci.org/ACloudGuru/serverless-plugin-package-dotenv-file.svg?branch=master)](https://travis-ci.org/ACloudGuru/serverless-plugin-package-dotenv-file)

A Serverless plugin to easily add CloudWatch alarms to functions


## Installation
`npm i serverless-plugin-lambda-alarms`


## Default definitions
```
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


## Usage

```
service: your-service
...
custom:
  lambdaAlarms:
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
      - throttles
    function:
      - functionInvocations
      - functionErrors
      - functionDuration

plugins:
  - serverless-plugin-lambda-alarms


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
