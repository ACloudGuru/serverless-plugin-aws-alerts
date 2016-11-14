'use strict';

const path = require('path');
const expect = require('chai').expect;

const Plugin = require('../src');

const testServicePath = path.join(__dirname, '.tmp');
const pluginFactory = (alarmsConfig) => {
  const serverless = {
    cli: { log: console.log },
    config: {
      servicePath: testServicePath
    },
    service: {
      custom: {
        lambdaAlarms: alarmsConfig
      }
    }
  };

  return new Plugin(serverless, {});
}

describe('#index', function() {
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
          errors: {
            metric: 'errors',
            threshold: 10,
            statistic: 'maximum',
            period: 300,
            evaluationPeriods: 1,
          },
          customDefinition: {
            metric: 'invocations',
            threshold: 5,
            statistic: 'minimum',
            period: 120,
            evaluationPeriods: 2,
          }
        }
      };

      const plugin = pluginFactory(config);
      const actual = plugin.getDefinitions(config);

      expect(actual).to.deep.equal({
        invocations: {
          metric: 'invocations',
          threshold: 100,
          statistic: 'sum',
          period: 60,
          evaluationPeriods: 1,
        },
        errors: {
          metric: 'errors',
          threshold: 10,
          statistic: 'maximum',
          period: 300,
          evaluationPeriods: 1,
        },
        duration: {
          metric: 'duration',
          threshold: 500,
          statistic: 'maximum',
          period: 60,
          evaluationPeriods: 1,
        },
        throttles: {
          metric: 'throttles',
          threshold: 50,
          statistic: 'sum',
          period: 60,
          evaluationPeriods: 1,
        },
        customDefinition: {
          metric: 'invocations',
          threshold: 5,
          statistic: 'minimum',
          period: 120,
          evaluationPeriods: 2,
        }
      });
    });
  });

  describe('#getFunctionAlarms', () => {
    const config = {
      definitions: {
        customAlarm: {
          metric: 'invocations',
          threshold: 5,
          statistic: 'minimum',
          period: 120,
          evaluationPeriods: 2,
        }
      },
      global: [ 'throttles' ],
      'function': [
        'invocations',
      ]
    };

    it('should get default function alarms - no alarms', () => {
      const plugin = pluginFactory(config);
      const definitions = plugin.getDefinitions(config);
      const actual = plugin.getFunctionAlarms({}, config, definitions);

      expect(actual).to.deep.equal([{
        name: 'invocations',
        metric: 'invocations',
        threshold: 100,
        statistic: 'sum',
        period: 60,
        evaluationPeriods: 1,
      }]);
    });

    it('should get default function alarms - empty alarms', () => {
      const plugin = pluginFactory(config);
      const definitions = plugin.getDefinitions(config);
      const actual = plugin.getFunctionAlarms({
        alarms: []
      }, config, definitions);

      expect(actual).to.deep.equal([{
        name: 'invocations',
        metric: 'invocations',
        threshold: 100,
        statistic: 'sum',
        period: 60,
        evaluationPeriods: 1,
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
          name: 'invocations',
          metric: 'invocations',
          threshold: 100,
          statistic: 'sum',
          period: 60,
          evaluationPeriods: 1,
        }, {
          name: 'customAlarm',
          metric: 'invocations',
          threshold: 5,
          statistic: 'minimum',
          period: 120,
          evaluationPeriods: 2,
      }]);
    });

    it('should get custom function alarms', () => {
      const plugin = pluginFactory(config);
      const definitions = plugin.getDefinitions(config);
      const actual = plugin.getFunctionAlarms({
        alarms: [{
          name: 'fooAlarm',
          metric: 'invocations',
          threshold: 5,
          statistic: 'minimum',
          period: 120,
          evaluationPeriods: 2,
        }]
      }, config, definitions);

      expect(actual).to.deep.equal([{
          name: 'invocations',
          metric: 'invocations',
          threshold: 100,
          statistic: 'sum',
          period: 60,
          evaluationPeriods: 1,
        }, {
          name: 'fooAlarm',
          metric: 'invocations',
          threshold: 5,
          statistic: 'minimum',
          period: 120,
          evaluationPeriods: 2,
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

  });
});
