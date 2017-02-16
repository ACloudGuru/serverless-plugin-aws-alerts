'use strict';

const path = require('path');

const expect = require('chai').expect;
const sinon = require('sinon');

const Plugin = require('../src');

const testServicePath = path.join(__dirname, '.tmp');

const pluginFactory = (alarmsConfig, stage) => {
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
					getLogGroupLogicalId: (name) => name,
					getLogGroupName: (name) => `/aws/lambda/${name}`,
					getStackName: () => 'fooservice-dev'
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
			expect(actual).to.equal(expected);
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

			expect(actual).to.deep.equal({
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
					statistic: 'Maximum',
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
				bunyanErrors: {
					namespace: 'AWS/Lambda',
					metric: 'BunyanErrors',
					threshold: 0,
					statistic: 'Sum',
					period: 60,
					evaluationPeriods: 1,
					comparisonOperator: 'GreaterThanThreshold',
					pattern: '{$.level > 40}'
				},
				bunyanWarnings: {
					namespace: 'AWS/Lambda',
					metric: 'BunyanWarnings',
					threshold: 0,
					statistic: 'Sum',
					period: 60,
					evaluationPeriods: 1,
					comparisonOperator: 'GreaterThanThreshold',
					pattern: '{$.level = 40}'
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

			expect(actual).to.deep.equal([{
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

			expect(actual).to.deep.equal([{
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

			expect(actual).to.deep.equal([{
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

			expect(actual).to.deep.equal([{
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
			}, config, definitions)).to.throw(Error);
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

			expect(topics).to.be.deep.equal({
				ok: topicArn
			});

			expect(plugin.serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({});
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

			expect(topics).to.be.deep.equal({
				ok: { Ref: `AwsAlertsOk` }
			});

			expect(plugin.serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
				'AwsAlertsOk': {
					Type: 'AWS::SNS::Topic',
					Properties: {
						TopicName: topicName
					}
				}
			});
		});
	});

	describe('#compileGlobalAlarms', () => {
		it('should compile global alarms', () => {
			const plugin = pluginFactory({
				global: ['functionThrottles'],
			});

			const config = plugin.getConfig();
			const definitions = plugin.getDefinitions(config);
			const alertTopics = plugin.compileAlertTopics(config);

			plugin.compileGlobalAlarms(config, definitions, alertTopics);

			expect(plugin.serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
				'GlobalFunctionThrottlesAlarm': {
					Type: 'AWS::CloudWatch::Alarm',
					Properties: {
						Namespace: 'AWS/Lambda',
						MetricName: 'Throttles',
						Threshold: 50,
						Statistic: 'Sum',
						Period: 60,
						EvaluationPeriods: 1,
						ComparisonOperator: 'GreaterThanThreshold',
						AlarmActions: [],
						OKActions: [],
						InsufficientDataActions: [],
						Dimensions: [{
							Name: 'FooLambdaFunctionName',
							Value: { Ref: 'FooLambdaFunction' },
						}]
					}
				}
			});
		});
		it('should not add any global log metrics', () => {
			const plugin = pluginFactory({
				global: ['bunyanErrors'],
			});

			const config = plugin.getConfig();
			const definitions = plugin.getDefinitions(config);
			const alertTopics = plugin.compileAlertTopics(config);

			plugin.compileGlobalAlarms(config, definitions, alertTopics);

			expect(plugin.serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({});
		});

	});

	describe('#compileFunctionAlarms', () => {
		it('should compile default function alarms', () => {
			const plugin = pluginFactory({
				'function': [
					'functionInvocations',
				]
			});

			const config = plugin.getConfig();
			const definitions = plugin.getDefinitions(config);
			const alertTopics = plugin.compileAlertTopics(config);

			plugin.compileFunctionAlarms(config, definitions, alertTopics);

			expect(plugin.serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
				'FooFunctionInvocationsAlarm': {
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
							Name: 'FooLambdaFunctionName',
							Value: { Ref: 'FooLambdaFunction' },
						}]
					}
				}
			});
		});
		it('should compile default log metric function alarms', () => {
			const plugin = pluginFactory({
				'function': [
					'bunyanErrors',
				]
			});

			const config = plugin.getConfig();
			const definitions = plugin.getDefinitions(config);
			const alertTopics = plugin.compileAlertTopics(config);

			plugin.compileFunctionAlarms(config, definitions, alertTopics);
			expect(plugin.serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal(
				{
					"FooBunyanErrorsAlarm": {
						"Type": "AWS::CloudWatch::Alarm",
						"Properties": {
							"Namespace": "AWS/Lambda",
							"MetricName": "FooserviceDevBunyanErrorsFooLambdaFunction",
							"Threshold": 0,
							"Statistic": "Sum",
							"Period": 60,
							"EvaluationPeriods": 1,
							"ComparisonOperator": "GreaterThanThreshold",
							"OKActions": [],
							"AlarmActions": [],
							"InsufficientDataActions": []
						}
					},
					"FooLambdaFunctionbunyanErrorsLogMetricFilterALERT": {
						"Type": "AWS::Logs::MetricFilter",
						"DependsOn": "foo",
						"Properties": {
							"FilterPattern": "{$.level > 40}",
							"LogGroupName": "/aws/lambda/foo",
							"MetricTransformations": [
								{
									"MetricValue": 1,
									"MetricNamespace": "AWS/Lambda",
									"MetricName": "FooserviceDevBunyanErrorsFooLambdaFunction"
								}
							]
						}
					},
					"FooLambdaFunctionbunyanErrorsLogMetricFilterOK": {
						"Type": "AWS::Logs::MetricFilter",
						"DependsOn": "foo",
						"Properties": {
							"FilterPattern": "",
							"LogGroupName": "/aws/lambda/foo",
							"MetricTransformations": [
								{
									"MetricValue": 0,
									"MetricNamespace": "AWS/Lambda",
									"MetricName": "FooserviceDevBunyanErrorsFooLambdaFunction"
								}
							]
						}
					}
				}
			);
		});

	});

	describe('#compileCloudWatchAlarms', () => {
		const stage = 'production';
		let plugin = null;

		let getConfigStub = null;
		let getDefinitionsStub = null;
		let compileAlertTopicsStub = null;
		let compileGlobalAlarmsStub = null;
		let compileFunctionAlarmsStub = null;

		const expectCompiled = (config, definitions, alertTopics) => {
			expect(getConfigStub.calledOnce).to.equal(true);

			expect(getDefinitionsStub.calledOnce).to.equal(true);
			expect(getDefinitionsStub.args[0][0]).to.equal(config);

			expect(compileAlertTopicsStub.calledOnce).to.equal(true);
			expect(compileAlertTopicsStub.args[0][0]).to.equal(config);

			expect(compileGlobalAlarmsStub.calledOnce).to.equal(true);
			expect(compileGlobalAlarmsStub.args[0][0]).to.equal(config);
			expect(compileGlobalAlarmsStub.args[0][1]).to.equal(definitions);
			expect(compileGlobalAlarmsStub.args[0][2]).to.equal(alertTopics);

			expect(compileFunctionAlarmsStub.calledOnce).to.equal(true);
			expect(compileFunctionAlarmsStub.args[0][0]).to.equal(config);
			expect(compileFunctionAlarmsStub.args[0][1]).to.equal(definitions);
			expect(compileFunctionAlarmsStub.args[0][2]).to.equal(alertTopics);
		};

		beforeEach(() => {
			plugin = pluginFactory({}, stage);

			getConfigStub = sinon.stub(plugin, 'getConfig');
			getDefinitionsStub = sinon.stub(plugin, 'getDefinitions');
			compileAlertTopicsStub = sinon.stub(plugin, 'compileAlertTopics');
			compileGlobalAlarmsStub = sinon.stub(plugin, 'compileGlobalAlarms');
			compileFunctionAlarmsStub = sinon.stub(plugin, 'compileFunctionAlarms');
		});

		it('should compile alarms - by default', () => {
			const config = {};
			const definitions = {};
			const alertTopics = {};

			getConfigStub.returns(config);
			getDefinitionsStub.returns(definitions);
			compileAlertTopicsStub.returns(alertTopics);

			plugin.compileCloudWatchAlarms();

			expectCompiled(config, definitions, alertTopics);
		});

		it('should compile alarms - for stage', () => {
			const config = {
				stages: [stage]
			};
			const definitions = {};
			const alertTopics = {};

			getConfigStub.returns(config);
			getDefinitionsStub.returns(definitions);
			compileAlertTopicsStub.returns(alertTopics);

			plugin.compileCloudWatchAlarms();

			expectCompiled(config, definitions, alertTopics);
		});

		it('should not compile alarms without config', () => {
			getConfigStub.returns(null);

			plugin.compileCloudWatchAlarms();

			expect(getConfigStub.calledOnce).to.equal(true);

			expect(getDefinitionsStub.calledOnce).to.equal(false);
			expect(compileAlertTopicsStub.calledOnce).to.equal(false);
			expect(compileGlobalAlarmsStub.calledOnce).to.equal(false);
			expect(compileFunctionAlarmsStub.calledOnce).to.equal(false);
		});

		it('should not compile alarms on invalid stage', () => {
			getConfigStub.returns({
				stages: ['blah']
			});

			plugin.compileCloudWatchAlarms();

			expect(getConfigStub.calledOnce).to.equal(true);

			expect(getDefinitionsStub.calledOnce).to.equal(false);
			expect(compileAlertTopicsStub.calledOnce).to.equal(false);
			expect(compileGlobalAlarmsStub.calledOnce).to.equal(false);
			expect(compileFunctionAlarmsStub.calledOnce).to.equal(false);
		});
	});
});
