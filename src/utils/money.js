'use strict';

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const round1 = (value) => Math.round((value + Number.EPSILON) * 10) / 10;

const formatSoles = (value) =>
  `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatPercent = (value) =>
  `${value.toLocaleString('es-PE', { maximumFractionDigits: 1 })}%`;

module.exports = { round1, round2, formatSoles, formatPercent };
