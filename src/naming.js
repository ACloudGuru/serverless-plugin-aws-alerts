'use strict';

const _ = require('lodash');

const getNormalisedName = (name) => {
  return `${_.upperFirst(name.replace(/-/g, 'Dash').replace(/_/g, 'Underscore'))}`;
}

const FUNCTION_NAME_KEY = 'FunctionName';

class Naming {

  getAlarmCloudFormationRef(alarmName, prefix) {
    const normalizePrefix = getNormalisedName(prefix);
    const normalizedName = getNormalisedName(alarmName);

    return `${normalizePrefix}${normalizedName}Alarm`;
  }

  getLogMetricCloudFormationRef(normalizedName, alarmName) {
    return `${normalizedName}${_.upperFirst(alarmName)}LogMetricFilter`;
  }

  getPatternMetricName(metricName, functionName) {
    return `${_.upperFirst(metricName)}${functionName}`;
  }

  getDimensionsList(dimensionsList, funcRef) {
    let dimensionsOut = new Array();
    let funcNameDimension =  {
      'Name': 'FunctionName',
      'Value': {
        Ref: funcRef
      }
    };
    if(dimensionsList == null) {
      return [funcNameDimension];
    }
    let filteredDimensions = dimensionsList.filter( (dim) => {
      return dim.Name != 'FunctionName'
    })
    return [...filteredDimensions, funcNameDimension]
  }

}

module.exports = Naming;
