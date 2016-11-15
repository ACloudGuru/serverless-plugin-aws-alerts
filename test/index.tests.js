'use strict';

const path = require('path');

const expect = require('chai').expect;
const sinon = require('sinon');

const Plugin = require('../src');

const testServicePath = path.join(__dirname, '.tmp');

const pluginFactory = (alarmsConfig) => {
	const functions = {
		foo: {}
	}

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
		},
	};

	return new Plugin(serverless, {});
}

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

	describe('#compileCloudWatchAlamrs', () => {
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
	});

	describe('#compileCloudWatchAlamrs', () => {
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
	});

	describe('#compileCloudWatchAlamrs', () => {
		let plugin = null;

		let getConfigStub = null;
		let getDefinitionsStub = null;
		let compileAlertTopicsStub = null;
		let compileGlobalAlarmsStub = null;
		let compileFunctionAlarmsStub = null;

		beforeEach(() => {
			plugin = pluginFactory({});

			getConfigStub = sinon.stub(plugin, 'getConfig');
			getDefinitionsStub = sinon.stub(plugin, 'getDefinitions');
			compileAlertTopicsStub = sinon.stub(plugin, 'compileAlertTopics');
			compileGlobalAlarmsStub = sinon.stub(plugin, 'compileGlobalAlarms');
			compileFunctionAlarmsStub = sinon.stub(plugin, 'compileFunctionAlarms');
		});

		it('should compile alarms', () => {
			const config = {};
			const definitions = {};
			const alertTopics = {};

			getConfigStub.returns(config);
			getDefinitionsStub.returns(definitions);
			compileAlertTopicsStub.returns(alertTopics);

			plugin.compileCloudWatchAlamrs();

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
		});

		it('should not compile alarms without config', () => {
			getConfigStub.returns(null);

			plugin.compileCloudWatchAlamrs();

			expect(getConfigStub.calledOnce).to.equal(true);

			expect(getDefinitionsStub.calledOnce).to.equal(false);
			expect(compileAlertTopicsStub.calledOnce).to.equal(false);
			expect(compileGlobalAlarmsStub.calledOnce).to.equal(false);
			expect(compileFunctionAlarmsStub.calledOnce).to.equal(false);
		});
	});
});