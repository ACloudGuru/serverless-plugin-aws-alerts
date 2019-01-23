'use strict';

const Naming = require('./naming');

describe('#naming', function () {
  describe('#getAlarmCloudFormationRef', () => {
    let naming = null;
    beforeEach(() => naming = new Naming());

    it('should get alarm name', () => {
      const expected = 'PrefixFunctionErrorsAlarm';
      const actual = naming.getAlarmCloudFormationRef('functionErrors', 'prefix');
      expect(actual).toEqual(expected);
    });
  });

  describe('#getLogMetricCloudFormationRef', () => {
    let naming = null;
    beforeEach(() => naming = new Naming());

    it('should get alarm name', () => {
      const expected = 'PrefixFunctionErrorsLogMetricFilter';
      const actual = naming.getLogMetricCloudFormationRef('Prefix', 'functionErrors');
      expect(actual).toEqual(expected);
    });
  });

  describe('#getPatternMetricName', () => {
    let naming = null;
    beforeEach(() => naming = new Naming());

    it('should get the pattern metric name', () => {
      const expected = 'MetricNamefoo';
      const actual = naming.getPatternMetricName('MetricName', 'foo');
      expect(actual).toEqual(expected);
    });
  });

  describe('#getDimensionsMap', () => {
    let naming = null;
    beforeEach( () => naming = new Naming());

    it('should use function name derived from funcref', () => {
      const expected = [{"Name":"Duck", "Value":"QUACK"}, {"Name":"FunctionName", "Value": {'Ref': 'funcName'}}]
      const actual = naming.getDimensionsList([{'FunctionName':'overridden'},{'Duck':'QUACK'}], 'funcName')
      expect(actual).toEqual(expected);
    });

    it('should get a mapped dimensions object when FunctionName is missing', () => {
      const expected = [{"Name":"Duck", "Value":"QUACK"}, {"Name":"FunctionName", "Value":{'Ref': 'funcName'}}]
      const actual = naming.getDimensionsList([{'Duck':'QUACK'}], 'funcName');
      expect(actual).toEqual(expected);
    });
  });
});
