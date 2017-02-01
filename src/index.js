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
			'deploy:compileEvents': this.compileCloudWatchAlamrs.bind(this),
		};
	}

	getConfig() {
		return this.serverless.service.custom.alerts;
	}

	getDefinitions(config) {
		return _.merge({}, defaultDefinitions, config.definitions)
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
			okActions.push({ Ref: alertTopics.ok })
		}

		if(alertTopics.alarm) {
			alarmActions.push({ Ref: alertTopics.alarm })
		}

		if(alertTopics.insufficientData) {
			insufficientDataActions.push({ Ref: alertTopics.insufficientData })
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
 
                if (definition.pattern){
                    //                    
                    properties.Namespace = this.serverless.service.service + '_' + properties.Namespace
                    properties.MetricName =  properties.MetricName + functionRefs[0]                   
                } else {
                    // use dimensions unless a pattern is specified

                    const dimensions = _.map(functionRefs, (ref) => {
                        return {
				Name: `${ref}Name`,
				Value: {
					Ref: ref,
				},
			};
                    });

                    properties.Dimensions = dimensions
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
				const topicName = config.topics[key];
				if(topicName) {
					const cfRef = `AwsAlerts${_.upperFirst(key)}`
					alertTopics[key] = cfRef;
					
					this.addCfResources({
						[cfRef]: this.getCfSnsTopic(topicName),
					});
				}
			});
		}

		return alertTopics;
	}

        getLogMetricCF(alarm, functionName, normalizedFunctionName){
            var output = {}
            if (alarm.pattern){
                //add custom log metric
                const logMetricCFRef = this.naming.getLogMetricCFRef(normalizedFunctionName,alarm.name)
                const CFLogName = this.serverless.providers.aws.naming.getLogGroupLogicalId(functionName);
                output[logMetricCFRef] = {
                    Type: "AWS::Logs::MetricFilter",
                    DependsOn: CFLogName,
                    Properties: {
                        FilterPattern: alarm.pattern,
                        LogGroupName: this.serverless.providers.aws.naming.getLogGroupName(this.serverless.service.getFunction(functionName).name),
                        MetricTransformations:[{
                            MetricValue: 1,
                            MetricNamespace:this.serverless.service.service + '_' + alarm.namespace,
                            MetricName: alarm.metric + normalizedFunctionName
                        }]
                    }
                }    

            }else{
                // not a custom log metric, nothing to add
            }
            return output
        }

	compileGlobalAlarms(config, definitions, alertTopics) {
		const globalAlarms = this.getGlobalAlarms(config, definitions);
		const functionRefs = this.serverless.service
			.getAllFunctions()
			.map(functionName => {
				const normalizedName = this.naming.getNormalisedName(functionName)
				return this.naming.getLambdaFunctionCFRef(normalizedName);
			});

		const alarmStatements = _.reduce(globalAlarms, (statements, alarm) => {
			const key = this.naming.getAlarmCFRef(alarm.name, 'Global');
			const cf = this.getAlarmCloudFormation(alertTopics, alarm, functionRefs);
			statements[key] = cf;
                        if (alarm.pattern){
                            const logMetricCF = this.getLogMetricCF(alarm, functionRefs);
                            _.merge(statements, logMetricCF)
                        }
			return statements;
		}, {});

		this.addCfResources(alarmStatements);
	}

	compileFunctionAlarms(config, definitions, alertTopics) {
		this.serverless.service.getAllFunctions().forEach((functionName) => {
			const functionObj = this.serverless.service.getFunction(functionName);

			const normalizedName = this.naming.getNormalisedName(functionName)
			const normalizedFunctionName = this.naming.getLambdaFunctionCFRef(normalizedName);

			const alarms = this.getFunctionAlarms(functionObj, config, definitions);

			const alarmStatements = _.reduce(alarms, (statements, alarm) => {
				const key = this.naming.getAlarmCFRef(alarm.name, normalizedName);
				const cf = this.getAlarmCloudFormation(alertTopics, alarm, [
					normalizedFunctionName
				]);
				statements[key] = cf;
                                const logMetricCF = this.getLogMetricCF(alarm, functionName, normalizedFunctionName);
                                _.merge(statements, logMetricCF)

				return statements;
			}, {});

			this.addCfResources(alarmStatements);
		});
	}

	compileCloudWatchAlamrs() {
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
