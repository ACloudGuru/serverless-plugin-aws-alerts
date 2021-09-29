'use strict';

// Try to remove this. Such a large package
const _ = require('lodash');

const Naming = require('./naming');
const defaultDefinitions = require('./defaults/definitions');

const dashboards = require('./dashboards')

class AlertsPlugin {
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
    const configDefinitions = config.definitions || {};
    return {
      ...configDefinitions,
      ...Object.keys(defaultDefinitions)
        .reduce((acc, definitionName) => {
          const definition = defaultDefinitions[definitionName];
          if (_.isFunction(definition)) {
            return {
              ...acc,
              [definitionName]: definition(configDefinitions[definitionName] || {}),
            };
          }

          return {
            ...acc,
            [definitionName]: {
              ...definition,
              ...(configDefinitions[definitionName] || {}),
            },
          };
        }, {}),
    };
  }

  getAlarms(alarms, definitions, functionName) {
    if (!alarms) return [];

    return alarms.reduce((result, alarm) => {
      if (_.isString(alarm)) {
        let definition = definitions[alarm];
        if (!definition) {
          throw new Error(`Alarm definition ${alarm} does not exist!`);
        }

        if (_.isFunction(definition)) {
          definition = definition(functionName, this.serverless)
        }

        if (!Array.isArray(definition)) {
          definition = [definition]
        }

        for (const def of definition) {
          result.push(Object.assign({}, def, {
            name: `${alarm}${def.nameSuffix || ''}`
          }));
        }
      } else if (_.isObject(alarm)) {
        let definition = definitions[alarm.name];
        if(_.isFunction(definition)){
          definition = definition(functionName, this.serverless)
          for (const def of definition) {
            result.push({
              ...def,
              ...alarm.overrides,
              name: `${alarm.name}${def.nameSuffix || ''}`
            });
          }
        }else{
          result.push(_.merge({}, definition, alarm));
        }
      }

      return result;
    }, []);
  }

  getGlobalAlarms(config, definitions) {
    if (!config) throw new Error('Missing config argument');
    if (!definitions) throw new Error('Missing definitions argument');

    return _.union(config.alarms, config.global, config.function);
  }

  getFunctionAlarms(functionName, functionObj, config, definitions, globalAlarms) {
    if (!config) throw new Error('Missing config argument');
    if (!definitions) throw new Error('Missing definitions argument');

    const functionAlarms = functionObj.alarms;
    let funcGlobalAlarms = globalAlarms;
    if (functionObj.inheritGlobalAlarms === false) {
      funcGlobalAlarms = [];
    }

    return this.getAlarms(functionAlarms ? functionAlarms.concat(funcGlobalAlarms) : funcGlobalAlarms, definitions, functionName);
  }

  getAlarmCloudFormation(alertTopics, definition, functionName, functionRef) {
    if (!functionRef) {
      return;
    }

    const okActions = [];
    const alarmActions = [];
    const insufficientDataActions = [];

    if (definition.okActions) {
      definition.okActions.map(alertTopic => { okActions.push(alertTopics[alertTopic].ok) });
    } else if (alertTopics.ok) {
      okActions.push(alertTopics.ok);
    }

    if (definition.alarmActions) {
      definition.alarmActions.map(alertTopic => { alarmActions.push(alertTopics[alertTopic].alarm) });
    } else if (alertTopics.alarm) {
      alarmActions.push(alertTopics.alarm);
    }

    if (definition.insufficientDataActions) {
      definition.insufficientDataActions.map(alertTopic => { insufficientDataActions.push(alertTopics[alertTopic].insufficientData) });
    } else if (alertTopics.insufficientData) {
      insufficientDataActions.push(alertTopics.insufficientData);
    }

    const stackName = this.awsProvider.naming.getStackName();

    const metricId = definition.pattern ? this.naming.getPatternMetricName(definition.metric, functionRef) :
      definition.metric;

    const dimensions = definition.pattern ? [] : this.naming.getDimensionsList(definition.dimensions, functionRef, definition.omitDefaultDimension);

    const treatMissingData = definition.treatMissingData ? definition.treatMissingData : 'missing';

    let alarm = {
      Type: 'AWS::CloudWatch::Alarm',
      Properties: {
        AlarmDescription: definition.description,
        Threshold: definition.threshold,
        Period: definition.period,
        EvaluationPeriods: definition.evaluationPeriods,
        DatapointsToAlarm: definition.datapointsToAlarm,
        ComparisonOperator: definition.comparisonOperator,
        OKActions: okActions,
        AlarmActions: alarmActions,
        InsufficientDataActions: insufficientDataActions,
        Dimensions: dimensions,
        TreatMissingData: treatMissingData,
      },
    };

    if (definition.metrics) {
      alarm.Properties.Metrics = definition.metrics;
    } else {
      alarm.Properties.Namespace = definition.pattern ? stackName : definition.namespace;
      alarm.Properties.MetricName = metricId;

      const statisticValues = ['SampleCount', 'Average', 'Sum', 'Minimum', 'Maximum'];
      if (_.includes(statisticValues, definition.statistic)) {
        alarm.Properties.Statistic = definition.statistic
      } else {
        alarm.Properties.ExtendedStatistic = definition.statistic
      }
    }

    if (definition.nameTemplate) {
      alarm.Properties.AlarmName = this.naming.getAlarmName({
        template: definition.nameTemplate,
        functionLogicalId: functionRef,
        metricName: definition.metric,
        metricId,
        functionName,
        stackName
      });
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

  _addAlertTopic(key, topics, alertTopics, customAlarmName) {
    const topicConfig = topics[key];
    const isTopicConfigAnObject = _.isObject(topicConfig);
    const isTopicConfigAnImport = isTopicConfigAnObject && topicConfig['Fn::ImportValue'];

    const topic = isTopicConfigAnObject ? topicConfig.topic : topicConfig;
    const notifications = isTopicConfigAnObject ? topicConfig.notifications : [];

    if (topic) {
      if (isTopicConfigAnImport || topic.indexOf('arn:') === 0) {
        alertTopics[key] = topic;
      } else {
        const cfRef = `AwsAlerts${customAlarmName ? _.upperFirst(customAlarmName) : ''}${_.upperFirst(key)}`;
        if (customAlarmName) {
          if (!alertTopics[customAlarmName]) {
            alertTopics[customAlarmName] = {}
          }
          alertTopics[customAlarmName][key] = {
            Ref: cfRef
          };
        } else {
          alertTopics[key] = {
            Ref: cfRef
          };
        }

        this.addCfResources({
          [cfRef]: this.getSnsTopicCloudFormation(topic, notifications),
        });
      }
    }
  }

  compileAlertTopics(config) {
    const alertTopics = {};

    if (config.topics) {
      Object.keys(config.topics).forEach((key) => {
        if (['ok', 'alarm', 'insufficientData'].indexOf(key) !== -1) {
          this._addAlertTopic(key, config.topics, alertTopics)
        } else {
          Object.keys(config.topics[key]).forEach((subkey) => {
            this._addAlertTopic(subkey, config.topics[key], alertTopics, key)
          })
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


      const alarms = this.getFunctionAlarms(functionName, functionObj, config, definitions, globalAlarms)
        .map(alarm => _.assign({ nameTemplate: config.nameTemplate }, alarm));

      const alarmStatements = alarms.reduce((statements, alarm) => {
        const key = this.naming.getAlarmCloudFormationRef(alarm.name, functionName);
        const cf = this.getAlarmCloudFormation(alertTopics, alarm, functionName, normalizedFunctionName);

        statements[key] = cf;

        const logMetricCF = this.getLogMetricCloudFormation(alarm, functionName, normalizedFunctionName, functionObj);
        _.merge(statements, logMetricCF);

        return statements;
      }, {});

      this.addCfResources(alarmStatements);
    });
  }

  getDashboardTemplates(configDashboards) {
    const configType = typeof configDashboards;

    if (configType === 'boolean') {
      return ['default']
    } else if (configType === 'string') {
      return [configDashboards]
    } else {
      return [].concat(configDashboards);
    }
  }

  compileDashboards(configDashboards) {
    const service = this.serverless.service;
    const provider = service.provider;
    const stage = this.options.stage;
    const region = this.options.region || provider.region;
    const dashboardTemplates = this.getDashboardTemplates(configDashboards);

    const functions = this.serverless.service
      .getAllFunctions()
      .map(functionName => ({ name: functionName }));

    const cf = _.chain(dashboardTemplates)
      .uniq()
      .reduce((acc, d) => {
        const dashboard = dashboards.createDashboard(service.service, stage, region, functions, d);

        const cfResource = d === 'default'
          ? 'AlertsDashboard'
          : `AlertsDashboard${d}`;
        const dashboardName = d === 'default'
          ? `${service.service}-${stage}-${region}`
          : `${service.service}-${stage}-${region}-${d}`;

        acc[cfResource] = {
          Type: 'AWS::CloudWatch::Dashboard',
          Properties: {
            DashboardName: dashboardName,
            DashboardBody: JSON.stringify(dashboard),
          }
        };
        return acc;
      }, {})
      .value();
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
      this.compileDashboards(config.dashboards)
    }
  }

  addCfResources(resources) {
    _.merge(this.serverless.service.provider.compiledCloudFormationTemplate.Resources, resources);
  }
}

module.exports = AlertsPlugin;
