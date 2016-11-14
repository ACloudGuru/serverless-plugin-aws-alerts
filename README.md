# Serverless Package Env Plugin [![Build Status](https://travis-ci.org/ACloudGuru/serverless-plugin-package-dotenv-file.svg?branch=master)](https://travis-ci.org/ACloudGuru/serverless-plugin-package-dotenv-file)

A Serverless plugin to copy a .env file into the serverless package


## Installation
`npm i serverless-plugin-package-dotenv-file`


## Default definitions
```
definitions:
  invocations:
    metric: invocations
    threshold: 100
    statistic: sum
    period: 60
    evaluationPeriods: 1
  errors:
    metric: errors
    threshold: 10
    statistic: maximum
    period: 60
    evaluationPeriods: 1
  duration:
    metric: duration
    threshold: 500
    statistic: maximum
    period: 60
    evaluationPeriods: 1
  throttles:
    metric: throttles
    threshold: 50
    statistic: sum
    period: 60
    evaluationPeriods: 1
```


## Usage

```
service: your-service
...
custom:
  lambdaAlarms:
    definitions:  # these defaults are merged with your definitions
      errors:
        period: 300 # override period
      customAlarm:
        metric: duration
        threshold: 200
        statistic: average
        period: 300
    global:
      - throttles
    function:
      - invocations
      - errors
      - duration

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
