'use strict';

const expect = require('chai').expect;

const Naming = require('../src/naming');

describe('#naming', function () {
	describe('#getNormalisedName', () => {
		let naming = null;
		beforeEach(() => naming = new Naming());

		it('should normalise name', () => {
			const expected = 'FuncName';
			const actual = naming.getNormalisedName('funcName');
			expect(actual).to.equal(expected);
		});

		it('should normalise name with dash', () => {
			const expected = 'FuncDashname';
			const actual = naming.getNormalisedName('func-name');
			expect(actual).to.equal(expected);
		});

		it('should normalise name with underscore', () => {
			const expected = 'FuncUnderscorename';
			const actual = naming.getNormalisedName('func_name');
			expect(actual).to.equal(expected);
		});
	});

	describe('#getLambdaFunctionCFRef', () => {
		let naming = null;
		beforeEach(() => naming = new Naming());

		it('should get lambda function name', () => {
			const expected = 'FuncNameLambdaFunction';
			const actual = naming.getLambdaFunctionCFRef('FuncName');
			expect(actual).to.equal(expected);
		});
	});

	describe('#getAlarmCFRef', () => {
		let naming = null;
		beforeEach(() => naming = new Naming());

		it('should get alarm name', () => {
			const expected = 'GlobalFunctionErrorsAlarm';
			const actual = naming.getAlarmCFRef('functionErrors', 'Global');
			expect(actual).to.equal(expected);
		});
	});
		
	describe('#getPatternMetricName', () => {
		let naming = null;
		beforeEach(() => naming = new Naming());

		it('should get the pattern metric name', () => {
			const expected = 'FooServiceTestMetricNamefoo';
			const actual = naming.getPatternMetricName('MetricName','fooService-test','foo');
			expect(actual).to.equal(expected);
		});
	});
});
