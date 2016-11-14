'use strict';

const path = require('path');

const _ = require('lodash');

const expect = require('chai').expect;

const Plugin = require('../src');

const testServicePath = path.join(__dirname, '.tmp');

const provider = {
	naming: {
		normalizeName(name) {
			return `${_.upperFirst(name)}`;
		},
		getNormalizedFunctionName(functionName) {
			return this.normalizeName(functionName
				.replace(/-/g, 'Dash')
				.replace(/_/g, 'Underscore'));
		},
	}
}

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
				lambdaAlarms: alarmsConfig
			},
      getAllFunctions: () => Object.keys(functions),
      getFunction: (name) => functions[name],
      provider: {
        compiledCloudFormationTemplate: {
          Resources: {},
        },
      },
		},
		getProvider: () => provider,
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
			global: ['throttles'],
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
		const config = {
			global: ['throttles'],
			'function': [
				'functionInvocations',
			]
		};

		it('should get default function alarms - no alarms', () => {
			const plugin = pluginFactory(config);
			plugin.compileCloudWatchAlamrs();

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
					}
				}
			});
		});
	});
});