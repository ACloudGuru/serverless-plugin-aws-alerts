'use strict';

const _ = require('lodash');
const path = require('path');

const Plugin = require('./index');

const testServicePath = path.join(__dirname, '.tmp');

const pluginFactory = (alarmsConfig, s) => {
	const stage = s || 'dev';
	const functions = {
		foo: {
			name: 'foo'
		}
	};

	const serverless = {
		cli: {
			log: console.log
		},
		config: {
			servicePath: testServicePath
		},
		service: {
			custom: {
				alerts: alarmsConfig
			},
			getAllFunctions: () => Object.keys(functions),
			getFunction: (name) => functions[name],
			provider: {
				compiledCloudFormationTemplate: {
					Resources: {},
				},
			},
			service: 'fooservice',
		},
		getProvider: () => {
			return {
				naming: {
					getLambdaLogicalId: (name) => `${_.upperFirst(name)}LambdaFunction`,
					getLogGroupLogicalId: (name) => name,
					getLogGroupName: (name) => `/aws/lambda/${name}`,
					getStackName: () => `fooservice-${stage}`,
				}
			};
		}
	};
	return new Plugin(serverless, {
		stage,
	});
};

describe('#index', function () {
	describe('#getConfig', () => {
		it('should get config', () => {
			const expected = {};
			const plugin = pluginFactory(expected);
			const actual = plugin.getConfig();
			expect(actual).toEqual(expected);
		});
	});

	describe('#getDefinitions', () => {
		it('should merge definitions', () => {
			const config = {
				definitions: {
					functionErrors: {
						metric: 'Errors',
						threshold: 10,
						statistic: 'Maximum',
						period: 300,
						evaluationPeriods: 1,
						comparisonOperator: 'GreaterThanThreshold',
					},
					customDefinition: {
						namespace: 'AWS/Lambda',
						metric: 'Invocations',
						threshold: 5,
						statistic: 'Minimum',
						period: 120,
						evaluationPeriods: 2,
						comparisonOperator: 'GreaterThanThreshold',
					}
				}
			};

			const plugin = pluginFactory(config);
			const actual = plugin.getDefinitions(config);

			expect(actual).toEqual({
				functionInvocations: {
					namespace: 'AWS/Lambda',
					metric: 'Invocations',
					threshold: 100,
					statistic: 'Sum',
					period: 60,
					evaluationPeriods: 1,
					comparisonOperator: 'GreaterThanThreshold',
				},
				functionErrors: {
					namespace: 'AWS/Lambda',
					metric: 'Errors',
					threshold: 10,
					statistic: 'Maximum',
					period: 300,
					evaluationPeriods: 1,
					comparisonOperator: 'GreaterThanThreshold',
				},
				functionDuration: {
					namespace: 'AWS/Lambda',
					metric: 'Duration',
					threshold: 500,
					statistic: 'Average',
					period: 60,
					evaluationPeriods: 1,
					comparisonOperator: 'GreaterThanThreshold',
				},
				functionThrottles: {
					namespace: 'AWS/Lambda',
					metric: 'Throttles',
					threshold: 50,
					statistic: 'Sum',
					period: 60,
					evaluationPeriods: 1,
					comparisonOperator: 'GreaterThanThreshold',
				},
				customDefinition: {
					namespace: 'AWS/Lambda',
					metric: 'Invocations',
					threshold: 5,
					statistic: 'Minimum',
					period: 120,
					evaluationPeriods: 2,
					comparisonOperator: 'GreaterThanThreshold',
				}
			});
		});
	});

	describe('#getFunctionAlarms', () => {
		const config = {
			definitions: {
				customAlarm: {
					namespace: 'AWS/Lambda',
					metric: 'Invocations',
					threshold: 5,
					statistic: 'Minimum',
					period: 120,
					evaluationPeriods: 2,
					comparisonOperator: 'GreaterThanThreshold',
				}
			},
			global: ['functionThrottles'],
			'function': [
				'functionInvocations',
			]
		};

		it('should get default function alarms - no alarms', () => {
			const plugin = pluginFactory(config);
			const definitions = plugin.getDefinitions(config);
			const actual = plugin.getFunctionAlarms({}, config, definitions);

			expect(actual).toEqual([{
				name: 'functionInvocations',
				namespace: 'AWS/Lambda',
				metric: 'Invocations',
				threshold: 100,
				statistic: 'Sum',
				period: 60,
				evaluationPeriods: 1,
				comparisonOperator: 'GreaterThanThreshold',
			}]);
		});

		it('should get default function alarms - empty alarms', () => {
			const plugin = pluginFactory(config);
			const definitions = plugin.getDefinitions(config);
			const actual = plugin.getFunctionAlarms({
				alarms: []
			}, config, definitions);

			expect(actual).toEqual([{
				name: 'functionInvocations',
				namespace: 'AWS/Lambda',
				metric: 'Invocations',
				threshold: 100,
				statistic: 'Sum',
				period: 60,
				evaluationPeriods: 1,
				comparisonOperator: 'GreaterThanThreshold',
			}]);
		});

		it('should get defined function alarms', () => {
			const plugin = pluginFactory(config);
			const definitions = plugin.getDefinitions(config);
			const actual = plugin.getFunctionAlarms({
				alarms: [
					'customAlarm'
				]
			}, config, definitions);

			expect(actual).toEqual([{
				name: 'functionInvocations',
				namespace: 'AWS/Lambda',
				metric: 'Invocations',
				threshold: 100,
				statistic: 'Sum',
				period: 60,
				evaluationPeriods: 1,
				comparisonOperator: 'GreaterThanThreshold',
			}, {
				name: 'customAlarm',
				namespace: 'AWS/Lambda',
				metric: 'Invocations',
				threshold: 5,
				statistic: 'Minimum',
				period: 120,
				evaluationPeriods: 2,
				comparisonOperator: 'GreaterThanThreshold',
			}]);
		});

		it('should get custom function alarms', () => {
			const plugin = pluginFactory(config);
			const definitions = plugin.getDefinitions(config);
			const actual = plugin.getFunctionAlarms({
				alarms: [{
					name: 'fooAlarm',
					namespace: 'AWS/Lambda',
					metric: 'Invocations',
					threshold: 5,
					statistic: 'Minimum',
					period: 120,
					evaluationPeriods: 2,
					comparisonOperator: 'GreaterThanThreshold',
				}]
			}, config, definitions);

			expect(actual).toEqual([{
				name: 'functionInvocations',
				namespace: 'AWS/Lambda',
				metric: 'Invocations',
				threshold: 100,
				statistic: 'Sum',
				period: 60,
				evaluationPeriods: 1,
				comparisonOperator: 'GreaterThanThreshold',
			}, {
				name: 'fooAlarm',
				namespace: 'AWS/Lambda',
				metric: 'Invocations',
				threshold: 5,
				statistic: 'Minimum',
				period: 120,
				evaluationPeriods: 2,
				comparisonOperator: 'GreaterThanThreshold',
			}]);
		});

		it('should throw if definition is missing alarms', () => {
			const plugin = pluginFactory(config);
			const definitions = plugin.getDefinitions(config);

			expect(() => plugin.getFunctionAlarms({
				alarms: [
					'missingAlarm'
				]
			}, config, definitions)).toThrow(Error);
		});
	});

	describe('#compileAlertTopics', () => {
		it('should not create SNS topic when ARN is passed', () => {
			const topicArn = 'arn:aws:sns:us-east-1:123456789012:ok-topic';
			const plugin = pluginFactory({
				topics: {
					ok: topicArn
				}
			});

			const config = plugin.getConfig();
			const topics = plugin.compileAlertTopics(config);

			expect(topics).toEqual({
				ok: topicArn
			});

			expect(plugin.serverless.service.provider.compiledCloudFormationTemplate.Resources).toEqual({});
		});

		it('should create SNS topic when name is passed', () => {
			const topicName = 'ok-topic';
			const plugin = pluginFactory({
				topics: {
					ok: topicName
				}
			});

			const config = plugin.getConfig();
			const topics = plugin.compileAlertTopics(config);

			expect(topics).toEqual({
				ok: { Ref: `AwsAlertsOk` }
			});

			expect(plugin.serverless.service.provider.compiledCloudFormationTemplate.Resources).toEqual({
				'AwsAlertsOk': {
					Type: 'AWS::SNS::Topic',
					Properties: {
						TopicName: topicName
					}
				}
			});
		});
	});

	describe('#compileAlarms', () => {
		it('should compile default function alarms', () => {
			const plugin = pluginFactory({
				'function': [
					'functionInvocations',
				]
			});

			const config = plugin.getConfig();
			const definitions = plugin.getDefinitions(config);
			const alertTopics = plugin.compileAlertTopics(config);

			plugin.compileAlarms(config, definitions, alertTopics);

			expect(plugin.serverless.service.provider.compiledCloudFormationTemplate.Resources).toEqual({
				FooFunctionInvocationsAlarm: {
					Type: 'AWS::CloudWatch::Alarm',
					Properties: {
						Namespace: 'AWS/Lambda',
						MetricName: 'Invocations',
						Threshold: 100,
						Statistic: 'Sum',
						Period: 60,
						EvaluationPeriods: 1,
						ComparisonOperator: 'GreaterThanThreshold',
						AlarmActions: [],
						OKActions: [],
						InsufficientDataActions: [],
						Dimensions: [{
							Name: 'FunctionName',
							Value: { Ref: 'FooLambdaFunction' },
						}]
					}
				}
			});
		});
		it('should compile log metric function alarms', () => {
			let config = {
				definitions: {
					bunyanErrors: {
						metric: 'BunyanErrors',
						threshold: 0,
						statistic: 'Sum',
						period: 60,
						evaluationPeriods: 1,
						comparisonOperator: 'GreaterThanThreshold',
						pattern: '{$.level > 40}'
					}
				},
				'function':['bunyanErrors']
			};

			const plugin = pluginFactory(config);

			config = plugin.getConfig();
			const definitions = plugin.getDefinitions(config);
			const alertTopics = plugin.compileAlertTopics(config);

			plugin.compileAlarms(config, definitions, alertTopics);
			expect(plugin.serverless.service.provider.compiledCloudFormationTemplate.Resources).toEqual({
				FooBunyanErrorsAlarm: {
					Type: 'AWS::CloudWatch::Alarm',
					Properties: {
						Namespace: 'fooservice-dev',
						MetricName: 'BunyanErrorsFooLambdaFunction',
						Threshold: 0,
						Statistic: 'Sum',
						Period: 60,
						EvaluationPeriods: 1,
						ComparisonOperator: 'GreaterThanThreshold',
						OKActions: [],
						AlarmActions: [],
						InsufficientDataActions: [],
						Dimensions: [],
					},
				},
				FooLambdaFunctionBunyanErrorsLogMetricFilterALERT: {
					Type: 'AWS::Logs::MetricFilter',
					DependsOn: 'foo',
					Properties: {
						FilterPattern: '{$.level > 40}',
						LogGroupName: '/aws/lambda/foo',
						MetricTransformations: [{
							MetricValue: 1,
							MetricNamespace: 'fooservice-dev',
							MetricName: 'BunyanErrorsFooLambdaFunction'
						}],
					}
				},
				FooLambdaFunctionBunyanErrorsLogMetricFilterOK: {
					Type: 'AWS::Logs::MetricFilter',
					DependsOn: 'foo',
					Properties: {
						FilterPattern: '',
						LogGroupName: '/aws/lambda/foo',
						MetricTransformations: [{
							MetricValue: 0,
							MetricNamespace: 'fooservice-dev',
							MetricName: 'BunyanErrorsFooLambdaFunction'
						}],
					},
				},
			});
		});

	});

	describe('#compileCloudWatchAlarms', () => {
		const stage = 'production';
		let plugin = null;

		const expectCompiled = (config, definitions, alertTopics) => {
			expect(plugin.getConfig.mock.calls.length).toEqual(1);

			expect(plugin.getDefinitions.mock.calls.length).toEqual(1);
			expect(plugin.getDefinitions.mock.calls[0][0]).toEqual(config);

			expect(plugin.compileAlertTopics.mock.calls.length).toEqual(1);
			expect(plugin.compileAlertTopics.mock.calls[0][0]).toEqual(config);

			expect(plugin.compileAlarms.mock.calls.length).toEqual(1);
			expect(plugin.compileAlarms.mock.calls[0][0]).toEqual(config);
			expect(plugin.compileAlarms.mock.calls[0][1]).toEqual(definitions);
			expect(plugin.compileAlarms.mock.calls[0][2]).toEqual(alertTopics);
		};

		beforeEach(() => {
			plugin = pluginFactory({}, stage);

			plugin.getConfig = jest.fn();
			plugin.getDefinitions = jest.fn();
			plugin.compileAlertTopics = jest.fn();
			plugin.compileAlarms = jest.fn();
		});

		it('should compile alarms - by default', () => {
			const config = {};
			const definitions = {};
			const alertTopics = {};

			plugin.getConfig.mockImplementation(() => config);
			plugin.getDefinitions.mockImplementation(() => definitions);
			plugin.compileAlertTopics.mockImplementation(() => alertTopics);

			plugin.compileCloudWatchAlarms();

			expectCompiled(config, definitions, alertTopics);
		});

		it('should compile alarms - for stage', () => {
			const config = {
				stages: [stage]
			};
			const definitions = {};
			const alertTopics = {};

			plugin.getConfig.mockImplementation(() => config);
			plugin.getDefinitions.mockImplementation(() => definitions);
			plugin.compileAlertTopics.mockImplementation(() => alertTopics);

			plugin.compileCloudWatchAlarms();

			expectCompiled(config, definitions, alertTopics);
		});

		it('should not compile alarms without config', () => {
			plugin.getConfig.mockImplementation(() => null);

			plugin.compileCloudWatchAlarms();

			expect(plugin.getConfig.mock.calls.length).toEqual(1);

			expect(plugin.getDefinitions.mock.calls.length).toEqual(0);
			expect(plugin.compileAlertTopics.mock.calls.length).toEqual(0);
			expect(plugin.compileAlarms.mock.calls.length).toEqual(0);
		});

		it('should not compile alarms on invalid stage', () => {
			plugin.getConfig.mockImplementation(() => ({
				stages: ['blah']
			}));

			plugin.compileCloudWatchAlarms();

			expect(plugin.getConfig.mock.calls.length).toEqual(1);

			expect(plugin.getDefinitions.mock.calls.length).toEqual(0);
			expect(plugin.compileAlertTopics.mock.calls.length).toEqual(0);
			expect(plugin.compileAlarms.mock.calls.length).toEqual(0);
		});
	});
});
