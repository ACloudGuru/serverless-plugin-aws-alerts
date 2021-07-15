const { cloneDeep } = require('lodash');
const { upperFirst } = require('./helpers');

const getNormalisedName = (name) =>
  `${upperFirst(name.replace(/-/g, 'Dash').replace(/_/g, 'Underscore'))}`;

class Naming {
  getAlarmCloudFormationRef(alarmName, prefix) {
    const normalizePrefix = getNormalisedName(prefix);
    const normalizedName = getNormalisedName(alarmName);

    return `${normalizePrefix}${normalizedName}Alarm`;
  }

  getLogMetricCloudFormationRef(normalizedName, alarmName) {
    return `${normalizedName}${upperFirst(alarmName)}LogMetricFilter`;
  }

  getPatternMetricName(metricName, functionName) {
    return `${upperFirst(metricName)}${functionName}`;
  }

  getDimensionsList(dimensionsList, funcRef, omitDefaultDimension) {
    if (omitDefaultDimension) {
      return dimensionsList || [];
    }

    const funcNameDimension = {
      Name: 'FunctionName',
      Value: {
        Ref: funcRef,
      },
    };

    const filteredDimensions = (dimensionsList || []).filter(
      (dim) => dim.Name !== 'FunctionName'
    );
    filteredDimensions.push(funcNameDimension);
    return filteredDimensions;
  }

  getAlarmName(options) {
    const interpolatedTemplate = options.template
      .replace('$[functionName]', options.functionName)
      .replace('$[functionId]', options.functionLogicalId)
      .replace('$[metricName]', options.metricName)
      .replace('$[metricId]', options.metricId);

    const prefixTemplate =
      typeof options.prefixTemplate !== 'undefined'
        ? options.prefixTemplate
        : '$[stackName]';
    const interpolatedPrefix = prefixTemplate.replace(
      '$[stackName]',
      options.stackName
    );

    return interpolatedPrefix
      ? `${interpolatedPrefix}-${interpolatedTemplate}`
      : interpolatedTemplate;
  }

  prepareCustomMetrics(metrics, functionName, funcRef) {
    if (!metrics) return metrics;
    if (!Array.isArray(metrics)) return metrics;

    return metrics.map((originalMetric) => {
      const metric = cloneDeep(originalMetric);
      if (
        metric.MetricStat &&
        metric.MetricStat.Metric &&
        metric.MetricStat.Metric.Dimensions &&
        Array.isArray(metric.MetricStat.Metric.Dimensions)
      ) {
        const dimensions = metric.MetricStat.Metric.Dimensions;
        for (let i = 0; i < dimensions.length; i++) {
          const dimension = dimensions[i];
          if (typeof dimension.Value === 'string') {
            dimension.Value = dimension.Value.replace(
              '$[functionName]',
              functionName
            );
            dimension.Value = dimension.Value.replace('$[functionId]', funcRef);
          }
        }
      }
      return metric;
    });
  }
}

module.exports = Naming;
