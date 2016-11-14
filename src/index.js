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
    return _.assign({}, defaultDefinitions, config.definitions)
  }

  getFunctionAlarms(functionObj, config, definitions) {
    if(!config) throw new Error('Missing config argument');
    if(!definitions) throw new Error('Missing definitions argument');

    const alarms = _.union(config.function, functionObj.alarms);
    return _.reduce(alarms, (result, alarm) => {
      if(_.isString(alarm)) {
        const definition = definitions[alarm];
        
        if(!definition) {
          throw new Error(`Alarm definition ${alarm} does not exist!`);
        }

        result.push(_.assign({}, definition, {
          name: alarm
        }));
      } else if(_.isObject(alarm)) {
        result.push(alarm);
      }

      return result;
    }, []);
  }
  
  compileCloudWatchAlamrs() {
    const config = this.getConfig();
    const definitions = this.getDefinitions(config);

    // const baseCf = {
    //   Type: 'AWS::CloudWatch::Alarm',
    // };

    // const baseProperties = {
    //       MetricName: 'Errors',
    //       Namespace: 'AWS/Lambda',
    //       Statistic: 'Sum',
    //       Period: 60,
    //       EvaluationPeriods: 2,
    //       Threshold: 90,
    //       ComparisonOperator: 'GreaterThanThreshold',
    //       AlarmActions: [ ],
    //       OkActions: [ ],
    //   }

    this.serverless.service.getAllFunctions().forEach((functionName) => {
      const functionObj = this.serverless.service.getFunction(functionName);
      const alarms = this.getFunctionAlarms(functionObj, config, definitions);

      //_.merge(this.serverless.service.provider.compiledCloudFormationTemplate.Resources, newFilterStatement, newLogGroupStatement);
    });
  }
}

module.exports = Plugin;
