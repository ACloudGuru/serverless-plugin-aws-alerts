'use strict';

const _ = require('lodash');

const getNormalisedName = (name) => {
  return `${_.upperFirst(name.replace(/-/g, 'Dash').replace(/_/g, 'Underscore'))}`;
}

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
    filteredDimensions.push(funcNameDimension);
    console.log(filteredDimensions)
    return filteredDimensions
  }

}

module.exports = Naming;
