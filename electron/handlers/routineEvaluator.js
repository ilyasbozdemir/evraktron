import { Notification } from 'electron';

function getFieldValue(doc, fieldName) {
  if (!doc) return undefined;
  const topLevelFields = ['no', 'tip', 'kurum', 'birim', 'tarih', 'durum', 'aciklama', 'notlar', 'klasor', 'raf_no'];
  if (topLevelFields.includes(fieldName)) {
    return doc[fieldName];
  }
  // Try metadata
  try {
    const metadata = JSON.parse(doc.metadata || '{}');
    return metadata[fieldName];
  } catch (e) {
    return undefined;
  }
}

function compareEq(a, b) {
  if (a === undefined || b === undefined) return false;
  if (a === null || b === null) return a === b;
  const numA = Number(a);
  const numB = Number(b);
  if (!isNaN(numA) && !isNaN(numB) && String(a).trim() !== '' && String(b).trim() !== '') {
    return numA === numB;
  }
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

function evaluateSingleRule(doc, prevDoc, rule) {
  const currentVal = getFieldValue(doc, rule.field_name);
  const prevVal = getFieldValue(prevDoc, rule.field_name);
  const val = rule.value;

  switch (rule.operator) {
    case 'eq':
      return compareEq(currentVal, val);
    case 'neq':
      return !compareEq(currentVal, val);
    case 'contains':
      if (currentVal === undefined || currentVal === null) return false;
      return String(currentVal).toLowerCase().includes(String(val).toLowerCase());
    case 'gt': {
      const numA = Number(currentVal);
      const numB = Number(val);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA > numB;
      }
      return String(currentVal) > String(val);
    }
    case 'lt': {
      const numA = Number(currentVal);
      const numB = Number(val);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA < numB;
      }
      return String(currentVal) < String(val);
    }
    case 'changed': {
      const hasChanged = !compareEq(currentVal, prevVal);
      if (val && String(val).trim() !== '') {
        return hasChanged && compareEq(currentVal, val);
      }
      return hasChanged;
    }
    default:
      return false;
  }
}

function setFieldValue(db, doc, fieldName, newValue) {
  const topLevelFields = ['no', 'tip', 'kurum', 'birim', 'tarih', 'durum', 'aciklama', 'notlar', 'klasor', 'raf_no'];
  const currentValue = getFieldValue(doc, fieldName);

  if (compareEq(currentValue, newValue)) {
    return false; // No change, prevent infinite loop
  }

  if (topLevelFields.includes(fieldName)) {
    db.prepare(`UPDATE evraklar SET ${fieldName} = ?, updated_at = datetime('now') WHERE id = ?`).run(newValue, doc.id);
    doc[fieldName] = newValue;
    return true;
  } else {
    let metadata = {};
    try {
      metadata = JSON.parse(doc.metadata || '{}');
    } catch (e) {}
    metadata[fieldName] = newValue;
    const metaStr = JSON.stringify(metadata);
    db.prepare(`UPDATE evraklar SET metadata = ?, updated_at = datetime('now') WHERE id = ?`).run(metaStr, doc.id);
    doc.metadata = metaStr;
    return true;
  }
}

function replaceTemplatePlaceholders(text, doc) {
  if (!text) return '';
  return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const val = getFieldValue(doc, key.trim());
    return val !== undefined && val !== null ? String(val) : '';
  });
}

function executeActions(db, doc, actions) {
  let docUpdated = false;

  for (const action of actions) {
    let config = {};
    try {
      config = JSON.parse(action.config);
    } catch (e) {
      console.error('Failed to parse action config:', e);
      continue;
    }

    switch (action.action_type) {
      case 'set_field': {
        const { field_name, value } = config;
        if (field_name) {
          const updated = setFieldValue(db, doc, field_name, value);
          if (updated) {
            docUpdated = true;
            // Write action log to history
            db.prepare(`
              INSERT INTO hareketler (evrak_id, islem_tipi, kullanici, "not")
              VALUES (?, 'otomasyon', 'Sistem', ?)
            `).run(doc.id, `Otomasyon: "${field_name}" alanı "${value}" olarak güncellendi.`);
          }
        }
        break;
      }
      case 'notify': {
        const title = replaceTemplatePlaceholders(config.title || 'Evraktron Otomasyon', doc);
        const body = replaceTemplatePlaceholders(config.body || 'Bir otomasyon tetiklendi.', doc);
        if (Notification.isSupported()) {
          new Notification({ title, body }).show();
        }
        break;
      }
      case 'tag': {
        const { tag, renk } = config;
        if (tag) {
          const color = renk || '#3b82f6';
          // Check if already exists
          const existing = db.prepare('SELECT 1 FROM etiketler WHERE evrak_id = ? AND tag = ?').get(doc.id, tag);
          if (!existing) {
            db.prepare(`
              INSERT INTO etiketler (evrak_id, tag, renk)
              VALUES (?, ?, ?)
            `).run(doc.id, tag, color);
            // Log to history
            db.prepare(`
              INSERT INTO hareketler (evrak_id, islem_tipi, kullanici, "not")
              VALUES (?, 'otomasyon', 'Sistem', ?)
            `).run(doc.id, `Otomasyon: "${tag}" etiketi eklendi.`);
          }
        }
        break;
      }
      case 'log': {
        const logText = replaceTemplatePlaceholders(config.text || 'Otomasyon tetiklendi.', doc);
        db.prepare(`
          INSERT INTO hareketler (evrak_id, islem_tipi, kullanici, "not")
          VALUES (?, 'otomasyon', 'Sistem', ?)
        `).run(doc.id, logText);
        break;
      }
      default:
        console.warn(`Unknown action type: ${action.action_type}`);
    }
  }

  return docUpdated;
}

export function evaluateRoutines(db, doc, prevDoc) {
  if (!db) return;

  // Fetch active routines
  const routines = db.prepare('SELECT * FROM routines WHERE is_active = 1').all();

  for (const routine of routines) {
    const rules = db.prepare('SELECT * FROM routine_rules WHERE routine_id = ?').all(routine.id);
    const actions = db.prepare('SELECT * FROM routine_actions WHERE routine_id = ?').all(routine.id);

    if (rules.length === 0 || actions.length === 0) continue;

    // Evaluate rules sequentially
    let matches = true;
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      const ruleMatch = evaluateSingleRule(doc, prevDoc, rule);
      if (i === 0) {
        matches = ruleMatch;
      } else {
        if (rule.logic === 'OR') {
          matches = matches || ruleMatch;
        } else {
          matches = matches && ruleMatch;
        }
      }
    }

    if (matches) {
      executeActions(db, doc, actions);
    }
  }
}
