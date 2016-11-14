'use strict';

module.exports = {
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
    period: 60,
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
  }
};