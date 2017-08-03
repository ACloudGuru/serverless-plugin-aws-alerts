'use strict';

// Try to remove this. Such a large package
const _ = require('lodash');

const Naming = require('./naming');
const defaultDefinitions = require('./defaults/definitions');

const dashboards = require('./dashboards')

class Plugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.awsProvider = this.serverless.getProvider('aws');
    this.providerNaming = this.awsProvider.naming;
    this.naming = new Naming();

    this.hooks = {
      'package:compileEvents': this.compile.bind(this),
    };
  }

  getConfig() {
    return this.serverless.service.custom.alerts;
  }

  getDefinitions(config) {
    return _.merge({}, defaultDefinitions, config.definitions);
  }

  getAlarms(alarms, definitions) {
    if (!alarms) return [];

    return alarms.reduce((result, alarm) => {
      if (_.isString(alarm)) {
        const definition = definitions[alarm];

        if (!definition) {
          throw new Error(`Alarm definition ${alarm} does not exist!`);
        }

        result.push(Object.assign({}, definition, {
          name: alarm
        }));
      } else if (_.isObject(alarm)) {
        result.push(alarm);
      }

      return result;
    }, []);
  }

  getGlobalAlarms(config, definitions) {
    if (!config) throw new Error('Missing config argument');
    if (!definitions) throw new Error('Missing definitions argument');

    const alarms = _.union(config.alarms, config.global, config.function);

    return this.getAlarms(alarms, definitions);
  }

  getFunctionAlarms(functionObj, config, definitions) {
    if (!config) throw new Error('Missing config argument');
    if (!definitions) throw new Error('Missing definitions argument');

    const alarms = functionObj.alarms;
    return this.getAlarms(alarms, definitions);
  }

  getAlarmCloudFormation(alertTopics, definition, functionRef) {
    if (!functionRef) {
      return;
    }

    const okActions = [];
    const alarmActions = [];
    const insufficientDataActions = [];

    if (alertTopics.ok) {
      okActions.push(alertTopics.ok);
    }

    if (alertTopics.alarm) {
      alarmActions.push(alertTopics.alarm);
    }

    if (alertTopics.insufficientData) {
      insufficientDataActions.push(alertTopics.insufficientData);
    }

    const namespace = definition.pattern ?
      this.awsProvider.naming.getStackName() :
      definition.namespace;

    const metricName = definition.pattern ?
      this.naming.getPatternMetricName(definition.metric, functionRef) :
      definition.metric;

    const dimensions = definition.pattern ? [] : [{
      Name: 'FunctionName',
      Value: {
        Ref: functionRef,
      }
    }];

    const treatMissingData = definition.treatMissingData ? definition.treatMissingData : 'missing';

    const alarm = {
      Type: 'AWS::CloudWatch::Alarm',
      Properties: {
        Namespace: namespace,
        MetricName: metricName,
        AlarmDescription: definition.description,
        Threshold: definition.threshold,
        Period: definition.period,
        EvaluationPeriods: definition.evaluationPeriods,
        ComparisonOperator: definition.comparisonOperator,
        OKActions: okActions,
        AlarmActions: alarmActions,
        InsufficientDataActions: insufficientDataActions,
        Dimensions: dimensions,
        TreatMissingData: treatMissingData,
      }
    };

    const statisticValues = [ 'SampleCount', 'Average', 'Sum', 'Minimum', 'Maximum'];
    if (_.includes(statisticValues, definition.statistic)) {
      alarm.Properties.Statistic = definition.statistic
    } else {
      alarm.Properties.ExtendedStatistic = definition.statistic
    }
    return alarm;
  }

  getSnsTopicCloudFormation(topicName, notifications) {
    const subscription = (notifications || []).map((n) => ({
      Protocol: n.protocol,
      Endpoint: n.endpoint
    }));

    return {
      Type: 'AWS::SNS::Topic',
      Properties: {
        TopicName: topicName,
        Subscription: subscription,
      }
    };
  }

  compileAlertTopics(config) {
    const alertTopics = {};

    if (config.topics) {
      Object.keys(config.topics).forEach((key) => {
        const topicConfig = config.topics[key];
        const isTopicConfigAnObject = _.isObject(topicConfig);

        const topic = isTopicConfigAnObject ? topicConfig.topic : topicConfig;
        const notifications = isTopicConfigAnObject ? topicConfig.notifications : [];

        if (topic) {
          if (topic.indexOf('arn:') === 0) {
            alertTopics[key] = topic;
          } else {
            const cfRef = `AwsAlerts${_.upperFirst(key)}`;
            alertTopics[key] = {
              Ref: cfRef
            };

            this.addCfResources({
              [cfRef]: this.getSnsTopicCloudFormation(topic, notifications),
            });
          }
        }
      });
    }

    return alertTopics;
  }

  getLogMetricCloudFormation(alarm, functionName, normalizedFunctionName, functionObj) {
    if (!alarm.pattern) return {};

    const logMetricCFRefBase = this.naming.getLogMetricCloudFormationRef(normalizedFunctionName, alarm.name);
    const logMetricCFRefALERT = `${logMetricCFRefBase}ALERT`;
    const logMetricCFRefOK = `${logMetricCFRefBase}OK`;

    const cfLogName = this.providerNaming.getLogGroupLogicalId(functionName);
    const metricNamespace = this.providerNaming.getStackName();
    const logGroupName = this.providerNaming.getLogGroupName(functionObj.name);
    const metricName = this.naming.getPatternMetricName(alarm.metric, normalizedFunctionName);

    return {
      [logMetricCFRefALERT]: {
        Type: 'AWS::Logs::MetricFilter',
        DependsOn: cfLogName,
        Properties: {
          FilterPattern: alarm.pattern,
          LogGroupName: logGroupName,
          MetricTransformations: [{
            MetricValue: 1,
            MetricNamespace: metricNamespace,
            MetricName: metricName
          }]
        }
      },
      [logMetricCFRefOK]: {
        Type: 'AWS::Logs::MetricFilter',
        DependsOn: cfLogName,
        Properties: {
          FilterPattern: '',
          LogGroupName: logGroupName,
          MetricTransformations: [{
            MetricValue: 0,
            MetricNamespace: metricNamespace,
            MetricName: metricName
          }]
        }
      }
    };
  }

  compileAlarms(config, definitions, alertTopics) {
    const globalAlarms = this.getGlobalAlarms(config, definitions);

    this.serverless.service.getAllFunctions().forEach((functionName) => {
      const functionObj = this.serverless.service.getFunction(functionName);

      const normalizedFunctionName = this.providerNaming.getLambdaLogicalId(functionName);

      const functionAlarms = this.getFunctionAlarms(functionObj, config, definitions);
      const alarms = globalAlarms.concat(functionAlarms);

      const alarmStatements = alarms.reduce((statements, alarm) => {
        const key = this.naming.getAlarmCloudFormationRef(alarm.name, functionName);
        const cf = this.getAlarmCloudFormation(alertTopics, alarm, normalizedFunctionName);

        statements[key] = cf;

        const logMetricCF = this.getLogMetricCloudFormation(alarm, functionName, normalizedFunctionName, functionObj);
        _.merge(statements, logMetricCF);

        return statements;
      }, {});

      this.addCfResources(alarmStatements);
    });
  }

  compileDashboards() {
    const service = this.serverless.service;
    const provider = service.provider;
    const stage = this.options.stage;
    const region = provider.region;

    const functions = this.serverless.service
                          .getAllFunctions()
                          .map(functionName => ({ name: functionName }));

    const dashboard = dashboards.createDashboard(service.service, stage, region, functions, 'default');

    const cf = {
      AlertsDashboard: {
        Type: 'AWS::CloudWatch::Dashboard',
        Properties: {
          DashboardName: `${service.service}-${stage}-${region}`,
          DashboardBody: JSON.stringify(dashboard),
        },
      },
    };

    this.addCfResources(cf);
  }

  compile() {
    const config = this.getConfig();
    if (!config) {
      // TODO warn no config
      return;
    }

    if (config.stages && !_.includes(config.stages, this.options.stage)) {
      this.serverless.cli.log(`Warning: Not deploying alerts on stage ${this.options.stage}`);
      return;
    }

    const definitions = this.getDefinitions(config);
    const alertTopics = this.compileAlertTopics(config);

    this.compileAlarms(config, definitions, alertTopics);

    if (config.dashboards) {
      this.compileDashboards()
    }
  }

  addCfResources(resources) {
    _.merge(this.serverless.service.provider.compiledCloudFormationTemplate.Resources, resources);
  }
}

module.exports = Plugin;
