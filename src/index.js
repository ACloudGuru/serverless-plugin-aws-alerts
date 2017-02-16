'use strict';

const _ = require('lodash');

const Naming = require('./naming');
const defaultDefinitions = require('./defaults/definitions');

class Plugin {
	constructor(serverless, options) {
		this.serverless = serverless;
		this.options = options;
		this.naming = new Naming();

		this.hooks = {
			'deploy:compileEvents': this.compileCloudWatchAlarms.bind(this),
		};
	}

	getConfig() {
		return this.serverless.service.custom.alerts;
	}

	getDefinitions(config) {
		return _.merge({}, defaultDefinitions, config.definitions);
	}

	getAlarms(alarms, definitions) {
		return _.reduce(alarms, (result, alarm) => {
			if (_.isString(alarm)) {
				const definition = definitions[alarm];

				if (!definition) {
					throw new Error(`Alarm definition ${alarm} does not exist!`);
				}

				result.push(_.assign({}, definition, {
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

		return this.getAlarms(config.global, definitions);
	}

	getFunctionAlarms(functionObj, config, definitions) {
		if (!config) throw new Error('Missing config argument');
		if (!definitions) throw new Error('Missing definitions argument');

		const alarms = _.union(config.function, functionObj.alarms);
		return this.getAlarms(alarms, definitions);
	}

	getAlarmCloudFormation(alertTopics, definition, functionRefs) {
		if(!functionRefs || !functionRefs.length) {
			return;
		}

		const okActions = [];
		const alarmActions = [];
		const insufficientDataActions = [];

		if(alertTopics.ok) {
			okActions.push(alertTopics.ok);
		}

		if(alertTopics.alarm) {
			alarmActions.push(alertTopics.alarm);
		}

		if(alertTopics.insufficientData) {
			insufficientDataActions.push(alertTopics.insufficientData);
		}

		var properties = {
			Namespace: definition.namespace,
			MetricName: definition.metric,
			Threshold: definition.threshold,
			Statistic: definition.statistic,
			Period: definition.period,
			EvaluationPeriods: definition.evaluationPeriods,
			ComparisonOperator: definition.comparisonOperator,
			OKActions: okActions,
			AlarmActions: alarmActions,
			InsufficientDataActions: insufficientDataActions,
		};

		if (definition.pattern) {
			const stackName = this.serverless.getProvider('aws').naming.getStackName();
			properties.MetricName =  this.naming.getPatternMetricName(properties.MetricName, stackName, functionRefs[0]);
		} else {
			const dimensions = _.map(functionRefs, (ref) => {
				return {
					Name: `${ref}Name`,
					Value: {
						Ref: ref,
					},
				};
			});

			properties.Dimensions = dimensions;
		}

		return {
			Type: 'AWS::CloudWatch::Alarm',
			Properties: properties
		};
	}

	getCfSnsTopic(topicName) {
		return {
			Type: "AWS::SNS::Topic",
			Properties: {
				TopicName: topicName,
			}
		};
	}

	compileAlertTopics(config) {
		const alertTopics = {};

		if(config.topics) {
			Object.keys(config.topics).forEach((key) => {
				const topic = config.topics[key];
				if (topic) {
					if (topic.indexOf('arn:') === 0) {
						alertTopics[key] = topic;
					} else {
						const cfRef = `AwsAlerts${_.upperFirst(key)}`;
						alertTopics[key] = { Ref: cfRef };

						this.addCfResources({
							[cfRef]: this.getCfSnsTopic(topic),
						});
					}
				}
			});
		}

		return alertTopics;
	}

	getLogMetricCF(alarm, functionName, normalizedFunctionName){
		var output = {};
		if (alarm.pattern) {
			const stackName = this.serverless.getProvider('aws').naming.getStackName();
			const logMetricCFRefBase = this.naming.getLogMetricCFRef(normalizedFunctionName,alarm.name);
			const logMetricCFRefALERT = `${logMetricCFRefBase}ALERT`;
			const logMetricCFRefOK = `${logMetricCFRefBase}OK`;
			const CFLogName = this.serverless.getProvider('aws').naming.getLogGroupLogicalId(functionName);
			const metricNamespace = alarm.namespace;
			const logGroupName =  this.serverless.getProvider('aws').naming.getLogGroupName(this.serverless.service.getFunction(functionName).name);
			const metricName = this.naming.getPatternMetricName(alarm.metric, stackName, normalizedFunctionName);

			//add custom log metric for alert state
			output[logMetricCFRefALERT] = {
				Type: "AWS::Logs::MetricFilter",
				DependsOn: CFLogName,
				Properties: {
					FilterPattern: alarm.pattern,
					LogGroupName: logGroupName,
					MetricTransformations: [{
						MetricValue: 1,
						MetricNamespace: metricNamespace,
						MetricName: metricName
					}]
				}
			};
			//add custom log metric for ok state
						//NOTE: empty filter pattern matches all log lines
			output[logMetricCFRefOK] = {
				Type: "AWS::Logs::MetricFilter",
				DependsOn: CFLogName,
				Properties: {
					FilterPattern: "",
					LogGroupName: logGroupName,
					MetricTransformations: [{
						MetricValue: 0,
						MetricNamespace: metricNamespace,
						MetricName: metricName 
					}]
				}
			};

		}

		return output;
	}

	compileGlobalAlarms(config, definitions, alertTopics) {
		const globalAlarms = this.getGlobalAlarms(config, definitions);
		const functionRefs = this.serverless.service
			.getAllFunctions()
			.map(functionName => {
				const normalizedName = this.naming.getNormalisedName(functionName);
				return this.naming.getLambdaFunctionCFRef(normalizedName);
			});

		const alarmStatements = _.reduce(globalAlarms, (statements, alarm) => {
			const key = this.naming.getAlarmCFRef(alarm.name, 'Global');
			const cf = this.getAlarmCloudFormation(alertTopics, alarm, functionRefs);
			if (alarm.pattern){
				this.serverless.cli.log('Note: global log metric filters are not supported');
			} else {
				statements[key] = cf;
			}
			return statements;
		}, {});

		this.addCfResources(alarmStatements);
	}

	compileFunctionAlarms(config, definitions, alertTopics) {
		this.serverless.service.getAllFunctions().forEach((functionName) => {
			const functionObj = this.serverless.service.getFunction(functionName);

			const normalizedName = this.naming.getNormalisedName(functionName);
			const normalizedFunctionName = this.naming.getLambdaFunctionCFRef(normalizedName);

			const alarms = this.getFunctionAlarms(functionObj, config, definitions);

			const alarmStatements = _.reduce(alarms, (statements, alarm) => {
				const key = this.naming.getAlarmCFRef(alarm.name, normalizedName);
				const cf = this.getAlarmCloudFormation(alertTopics, alarm, [
					normalizedFunctionName
				]);
				statements[key] = cf;
				const logMetricCF = this.getLogMetricCF(alarm, functionName, normalizedFunctionName);
				_.merge(statements, logMetricCF);

				return statements;
			}, {});

			this.addCfResources(alarmStatements);
		});
	}

	compileCloudWatchAlarms() {
		const config = this.getConfig();
		if(!config) {
			// TODO warn no config
			return;
		}

		if(config.stages && !_.includes(config.stages, this.options.stage)) {
			this.serverless.cli.log(`Warning: Not deploying alerts on stage ${this.options.stage}`);
			return;
		}

		const definitions = this.getDefinitions(config);
		const alertTopics = this.compileAlertTopics(config);

		this.compileGlobalAlarms(config, definitions, alertTopics);
		this.compileFunctionAlarms(config, definitions, alertTopics);
	}

	addCfResources(resources) {
		_.merge(this.serverless.service.provider.compiledCloudFormationTemplate.Resources, resources);
	}
}

module.exports = Plugin;
