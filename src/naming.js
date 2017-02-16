'use strict';

const _ = require('lodash');

class Naming {
	getNormalisedName(name) {
		return `${_.upperFirst(name.replace(/-/g, 'Dash').replace(/_/g, 'Underscore'))}`;
	}

	getLambdaFunctionCFRef(normalizedName) {
		return `${normalizedName}LambdaFunction`;
	}

	getAlarmCFRef(alarmName, prefix) {
		const normalizedName = this.getNormalisedName(alarmName);
		return `${prefix}${normalizedName}Alarm`;
	}
		
	getLogMetricCFRef(normalizedName, alarmName){
		return `${normalizedName}${alarmName}LogMetricFilter`;
	}

	getPatternMetricName(metricName, stackName, functionName){
		stackName = _.upperFirst(_.camelCase(stackName));
		return `${stackName}${metricName}${functionName}`;
	}

}

module.exports = Naming;
