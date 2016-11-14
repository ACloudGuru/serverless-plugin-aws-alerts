'use strict';

const _ = require('lodash');

const defaultDefinitions = require('./defaults/definitions');

class Plugin {
	constructor(serverless, options) {
		this.serverless = serverless;
		this.options = options;

		this.hooks = {
			'deploy:compileEvents': this.compileCloudWatchAlamrs.bind(this),
		};
	}

	getConfig() {
		return this.serverless.service.custom.lambdaAlarms;
	}

	getDefinitions(config) {
		return _.merge({}, defaultDefinitions, config.definitions)
	}

	getFunctionAlarms(functionObj, config, definitions) {
		if (!config) throw new Error('Missing config argument');
		if (!definitions) throw new Error('Missing definitions argument');

		const alarms = _.union(config.function, functionObj.alarms);
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

	getAlarmCloudFormation(definition) {
		const properties = {
			Namespace: definition.namespace,
			MetricName: definition.metric,
			Threshold: definition.threshold,
			Statistic: definition.statistic,
			Period: definition.period,
			EvaluationPeriods: definition.evaluationPeriods,
			ComparisonOperator: definition.comparisonOperator,
			//AlarmActions: [ ],
			//OkActions: [ ],
		};


		return {
			Type: 'AWS::CloudWatch::Alarm',
			Properties: properties
		};
	}

	compileCloudWatchAlamrs() {
		const config = this.getConfig();
		const definitions = this.getDefinitions(config);

		this.serverless.service.getAllFunctions().forEach((functionName) => {
			const functionObj = this.serverless.service.getFunction(functionName);
      
			const normalizedName = `${_.upperFirst(functionName.replace(/-/g, 'Dash').replace(/_/g, 'Underscore'))}`;

			const alarms = this.getFunctionAlarms(functionObj, config, definitions);

			const alarmStatements = _.reduce(alarms, (statements, alarm) => {
				const key = `${normalizedName}${_.upperFirst(alarm.name)}Alarm`;
				const cf = this.getAlarmCloudFormation(alarm);
				statements[key] = cf;
				return statements;
			}, {});

			_.merge(this.serverless.service.provider.compiledCloudFormationTemplate.Resources, alarmStatements);
		});
	}
}

module.exports = Plugin;