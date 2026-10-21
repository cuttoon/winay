'use strict';

const { formatSoles, formatPercent } = require('../utils/money');

const SEVERITY_ORDER = Object.freeze({ critical: 0, high: 1, medium: 2, low: 3, positive: 4 });

/**
 * Each rule looks at the analysis and either returns a recommendation or null.
 * `tags` link the recommendation to learning resources in the content catalogue.
 * Adding a rule = adding one function to this list.
 */
const RULES = [
  function overspending(analysis) {
    const { remaining } = analysis.totals;
    if (remaining >= 0) return null;
    return {
      id: 'overspending',
      severity: 'critical',
      title: 'Estás gastando más de lo que ingresa',
      message: `En este periodo gastaste ${formatSoles(-remaining)} más de lo que ingresó. Si se repite, esa diferencia termina convirtiéndose en deuda.`,
      actions: [
        'Marca los gastos de "gustos" que puedes pausar este mes.',
        'Evita cubrir la diferencia con tarjeta de crédito.',
        'Pon un tope semanal de gasto y revísalo cada domingo.',
      ],
      tags: ['budget', 'debt', 'basics'],
    };
  },

  function savingsLevel(analysis) {
    const rate = analysis.savingsRate;
    if (rate < 0) return null;
    if (rate >= 20) {
      return {
        id: 'savings_on_track',
        severity: 'positive',
        title: 'Vas bien con tu ahorro',
        message: `Te queda el ${formatPercent(rate)} de tus ingresos, por encima de la referencia del 20%.`,
        actions: [
          'Automatiza una transferencia a una cuenta de ahorros apenas cobres.',
          'Ponle nombre a ese dinero: emergencia, estudios o una meta personal.',
        ],
        tags: ['saving', 'investing'],
      };
    }
    return {
      id: 'savings_below_target',
      severity: rate < 10 ? 'high' : 'medium',
      title: 'Tu ahorro está por debajo del 20% de referencia',
      message: `Te queda el ${formatPercent(rate)} de tus ingresos. Subir unos puntos con pequeños ajustes ya hace diferencia en un año.`,
      actions: [
        'Separa tu ahorro el día que cobras, antes de gastar ("págate primero").',
        'Empieza con una meta realista, por ejemplo 5% más que este periodo.',
      ],
      tags: ['saving', 'budget'],
    };
  },

  function wantsHigh(analysis) {
    const { wants } = analysis.buckets;
    if (wants.percentOfIncome <= wants.target) return null;
    return {
      id: 'wants_above_target',
      severity: wants.percentOfIncome > 40 ? 'high' : 'medium',
      title: 'Tus gustos pasan del 30% de tus ingresos',
      message: `Destinaste ${formatSoles(wants.amount)} (${formatPercent(wants.percentOfIncome)}) a gustos: salidas, compras, suscripciones y entretenimiento.`,
      actions: [
        'Elige las 2 categorías de gustos donde más disfrutas y reduce el resto.',
        'Usa la regla de las 48 horas antes de compras no planificadas.',
      ],
      tags: ['budget', 'basics'],
    };
  },

  function needsHigh(analysis) {
    const { needs } = analysis.buckets;
    if (needs.percentOfIncome <= needs.target) return null;
    return {
      id: 'needs_above_target',
      severity: 'medium',
      title: 'Tus necesidades pasan del 50% de tus ingresos',
      message: `Tus gastos esenciales suman ${formatSoles(needs.amount)} (${formatPercent(needs.percentOfIncome)}). Cuando los costos fijos pesan mucho, queda poco margen para ahorrar.`,
      actions: [
        'Revisa tus planes de internet y telefonía: compara antes de renovar.',
        'Si estudias, pregunta por opciones de pago, becas o descuentos.',
      ],
      tags: ['fixed-costs', 'budget'],
    };
  },

  function deliveryHigh(analysis) {
    const { delivery } = analysis.habits;
    if (delivery.count < 5 && delivery.percentOfIncome < 5) return null;
    return {
      id: 'delivery_frequent',
      severity: 'medium',
      title: 'El delivery se está volviendo un hábito caro',
      message: `Hiciste ${delivery.count} pedidos por delivery por ${formatSoles(delivery.amount)} (${formatPercent(delivery.percentOfIncome)} de tus ingresos). Con comisiones y propinas, cada pedido sale más caro que cocinar o llevar almuerzo.`,
      actions: [
        'Fija un máximo de pedidos por semana y llévalo en tus notas.',
        'Cocina en lote el domingo para 2 o 3 almuerzos.',
      ],
      tags: ['food', 'budget'],
    };
  },

  function subscriptionsHigh(analysis) {
    const { subscriptions } = analysis.habits;
    if (subscriptions.count < 3 && subscriptions.percentOfIncome < 3) return null;
    return {
      id: 'subscriptions_stack',
      severity: 'low',
      title: 'Tienes varias suscripciones activas',
      message: `Pagas ${subscriptions.count} suscripciones por ${formatSoles(subscriptions.amount)} en este periodo. Es fácil olvidar las que ya casi no usas.`,
      actions: [
        'Haz una lista y cancela las que no usaste en el último mes.',
        'Comparte planes familiares o rota servicios en vez de pagar todos a la vez.',
      ],
      tags: ['subscriptions', 'budget'],
    };
  },

  function smallPurchases(analysis) {
    const { smallPurchases: habit } = analysis.habits;
    if (habit.count < 8) return null;
    const yearly = (habit.amount * 12) / analysis.period.monthsCovered;
    return {
      id: 'micro_spending',
      severity: 'low',
      title: 'Los gastos hormiga se están acumulando',
      message: `${habit.count} compras de hasta ${formatSoles(habit.threshold)} suman ${formatSoles(habit.amount)}. Si mantienes este ritmo serían unos ${formatSoles(yearly)} al año.`,
      actions: [
        'Elige un solo gasto pequeño que puedas reducir esta semana.',
        'Lleva tu propio café o snack dos días a la semana.',
      ],
      tags: ['micro-spending', 'budget'],
    };
  },

  function debtBurden(analysis) {
    const { debtService } = analysis.habits;
    if (debtService.percentOfIncome < 10) return null;
    return {
      id: 'debt_burden',
      severity: debtService.percentOfIncome >= 15 ? 'high' : 'medium',
      title: 'Una parte importante de tu ingreso va a deudas',
      message: `Pagos de deuda: ${formatSoles(debtService.amount)} (${formatPercent(debtService.percentOfIncome)} de tus ingresos). Mientras más alto sea este porcentaje, menos flexibilidad tienes ante imprevistos.`,
      actions: [
        'Lista tus deudas con su tasa (TCEA) y prioriza la más cara.',
        'Evita pagar solo el mínimo de la tarjeta: los intereses siguen corriendo.',
      ],
      tags: ['debt', 'credit'],
    };
  },

  function dataQuality(analysis) {
    if (analysis.dataQuality.unclassifiedShare < 25) return null;
    return {
      id: 'low_data_quality',
      severity: 'low',
      title: 'Hay muchos gastos sin clasificar',
      message: `El ${formatPercent(analysis.dataQuality.unclassifiedShare)} de tus gastos no se pudo clasificar. Con descripciones más claras el análisis será más preciso.`,
      actions: [
        'Describe cada gasto con el comercio o motivo (por ejemplo "Yape almuerzo", no solo "Yape").',
      ],
      tags: ['basics', 'budget'],
    };
  },

  function emergencyFund(analysis) {
    if (analysis.totals.remaining <= 0) return null;
    return {
      id: 'emergency_fund',
      severity: 'low',
      title: 'Arma tu fondo de emergencia',
      message: 'Una referencia común es reunir entre 3 y 6 meses de tus gastos básicos en una cuenta aparte, para no depender de deudas ante un imprevisto.',
      actions: [
        'Calcula tus gastos básicos mensuales y multiplícalos por 3: esa es tu primera meta.',
        'Guárdalo en una cuenta de ahorros de una entidad autorizada por la SBS.',
      ],
      tags: ['emergency-fund', 'saving'],
    };
  },
];

function buildRecommendations(analysis) {
  return RULES.map((rule) => rule(analysis))
    .filter(Boolean)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

module.exports = { buildRecommendations };
