// Configurable automation engine: evaluates a rule's conditions against an entity, and if they
// match, applies its actions. Mirrors spec section 18's WHEN/THEN model. Kept side-effect-free
// at the evaluation layer (evaluateConditions, evaluateRule) so it's independently testable;
// applyActions is the only piece that touches the database.

function getFieldValue(entity, field) {
  return field.split('.').reduce((obj, key) => (obj == null ? undefined : obj[key]), entity)
}

function compare(operator, actual, expected) {
  switch (operator) {
    case 'EQUALS':
      return actual === expected
    case 'NOT_EQUALS':
      return actual !== expected
    case 'CONTAINS':
      return typeof actual === 'string' && actual.toLowerCase().includes(String(expected).toLowerCase())
    case 'NOT_CONTAINS':
      return !(typeof actual === 'string' && actual.toLowerCase().includes(String(expected).toLowerCase()))
    case 'STARTS_WITH':
      return typeof actual === 'string' && actual.toLowerCase().startsWith(String(expected).toLowerCase())
    case 'ENDS_WITH':
      return typeof actual === 'string' && actual.toLowerCase().endsWith(String(expected).toLowerCase())
    case 'GREATER_THAN':
      return Number(actual) > Number(expected)
    case 'LESS_THAN':
      return Number(actual) < Number(expected)
    case 'REGEX':
      try {
        return new RegExp(expected, 'i').test(String(actual ?? ''))
      } catch {
        return false
      }
    default:
      return false
  }
}

// conditions: [{ field, operator, value, junction }] — junction ('AND'|'OR') describes how THIS
// condition combines with the PREVIOUS one (first entry's junction is ignored). Evaluated
// left-to-right without operator precedence, matching how most no-code rule builders behave.
export function evaluateConditions(entity, conditions) {
  if (!Array.isArray(conditions) || conditions.length === 0) return true

  let result = compare(conditions[0].operator, getFieldValue(entity, conditions[0].field), conditions[0].value)
  for (let i = 1; i < conditions.length; i++) {
    const c = conditions[i]
    const clause = compare(c.operator, getFieldValue(entity, c.field), c.value)
    result = c.junction === 'OR' ? result || clause : result && clause
  }
  return result
}

export function evaluateRule(entity, rule) {
  return rule.enabled !== false && evaluateConditions(entity, rule.conditions)
}

// Selects and orders the rules that should run for a given trigger, matching the spec's
// "rule priority, rule order, continue subsequent rules after match" semantics: rules run in
// priority order, and a matched rule with continueAfterMatch=false stops evaluation of the rest.
export function selectMatchingRules(entity, rules, trigger) {
  const applicable = rules
    .filter((r) => r.enabled !== false && r.trigger === trigger)
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))

  const matched = []
  for (const rule of applicable) {
    if (evaluateConditions(entity, rule.conditions)) {
      matched.push(rule)
      if (rule.continueAfterMatch === false) break
    }
  }
  return matched
}

// Applies a rule's actions to a $set-style update object (pure — does not touch the DB itself).
// Non-field actions (NOTIFY, ESCALATE) are returned separately as side-effect descriptors for
// the caller to execute, since they need db/notify access this module intentionally doesn't have.
export function buildActionEffects(actions) {
  const fieldUpdates = {}
  const sideEffects = []

  for (const action of actions || []) {
    if (action.type === 'SET_FIELD' && action.field) {
      fieldUpdates[action.field] = action.value
    } else if (action.type === 'ASSIGN_GROUP' && action.value) {
      fieldUpdates.workGroup = action.value
    } else {
      sideEffects.push(action)
    }
  }

  return { fieldUpdates, sideEffects }
}
