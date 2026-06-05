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
    case 'not_contains':
      if (currentVal === undefined || currentVal === null) return true;
      return !String(currentVal).toLowerCase().includes(String(val).toLowerCase());
    case 'starts_with':
      if (currentVal === undefined || currentVal === null) return false;
      return String(currentVal).toLowerCase().startsWith(String(val).toLowerCase());
    case 'gt': {
      const numA = Number(currentVal);
      const numB = Number(val);
      if (!isNaN(numA) && !isNaN(numB)) return numA > numB;
      return String(currentVal) > String(val);
    }
    case 'lt': {
      const numA = Number(currentVal);
      const numB = Number(val);
      if (!isNaN(numA) && !isNaN(numB)) return numA < numB;
      return String(currentVal) < String(val);
    }
    case 'gte': {
      const numA = Number(currentVal);
      const numB = Number(val);
      if (!isNaN(numA) && !isNaN(numB)) return numA >= numB;
      return String(currentVal) >= String(val);
    }
    case 'lte': {
      const numA = Number(currentVal);
      const numB = Number(val);
      if (!isNaN(numA) && !isNaN(numB)) return numA <= numB;
      return String(currentVal) <= String(val);
    }
    // ── Tarih operatörleri ──────────────────────────────────────────────────
    case 'date_lt_today_plus': {
      if (!currentVal) return false;
      const fieldDate = new Date(currentVal);
      fieldDate.setHours(0, 0, 0, 0);
      const threshold = new Date();
      threshold.setDate(threshold.getDate() + Number(val || 0));
      threshold.setHours(23, 59, 59, 999);
      return fieldDate < threshold;
    }
    case 'date_gt_today_plus': {
      if (!currentVal) return false;
      const fieldDate = new Date(currentVal);
      fieldDate.setHours(0, 0, 0, 0);
      const threshold = new Date();
      threshold.setDate(threshold.getDate() + Number(val || 0));
      threshold.setHours(0, 0, 0, 0);
      return fieldDate > threshold;
    }
    case 'date_eq_today': {
      if (!currentVal) return false;
      const fieldDate = new Date(currentVal);
      const today = new Date();
      return fieldDate.toDateString() === today.toDateString();
    }
    case 'date_expired': {
      if (!currentVal) return false;
      const fieldDate = new Date(currentVal);
      fieldDate.setHours(23, 59, 59, 999);
      return fieldDate < new Date();
    }
    // ── Genel operatörler ───────────────────────────────────────────────────
    case 'is_empty':
      return currentVal === undefined || currentVal === null || String(currentVal).trim() === '';
    case 'is_not_empty':
      return currentVal !== undefined && currentVal !== null && String(currentVal).trim() !== '';
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

/**
 * Şablon alanlarına gömülü rutinleri çalıştırır.
 * Evrak kayıt/güncelleme sırasında çağrılır.
 * @param {object} db - SQLite bağlantısı
 * @param {object} doc - Güncellenen evrak
 * @param {object|null} prevDoc - Önceki evrak durumu
 * @param {object} template - Evrakın şablonu (definition JSON)
 */
export function evaluateFieldRutinler(db, doc, prevDoc, template) {
  if (!db || !doc || !template || !Array.isArray(template.fields)) return;

  for (const field of template.fields) {
    if (!Array.isArray(field.rutinler) || field.rutinler.length === 0) continue;

    const currentVal = getFieldValue(doc, field.key);

    for (const rutin of field.rutinler) {
      // Koşul değerlendirmesi
      const ruleObj = { field_name: field.key, operator: rutin.operator, value: rutin.value };
      const triggered = evaluateSingleRule(doc, prevDoc || {}, ruleObj);
      if (!triggered) continue;

      // Aksiyon çalıştır
      switch (rutin.aksiyon) {
        case 'os_bildir': {
          const baslik = rutin.bildirimBaslik
            ? replaceTemplatePlaceholders(rutin.bildirimBaslik, doc)
            : `Evraktron — ${rutin.name}`;
          const mesaj = rutin.bildirimMesaj
            ? replaceTemplatePlaceholders(rutin.bildirimMesaj, doc)
            : `"${field.label}" koşulu tetiklendi: ${currentVal}`;
          if (Notification.isSupported()) {
            new Notification({ title: baslik, body: mesaj }).show();
          }
          break;
        }
        case 'etiket_ekle': {
          if (rutin.etiket) {
            const tag = rutin.etiket;
            const renk = rutin.etiketRenk || '#f59e0b';
            const existing = db.prepare('SELECT 1 FROM etiketler WHERE evrak_id = ? AND tag = ?').get(doc.id, tag);
            if (!existing) {
              db.prepare('INSERT INTO etiketler (evrak_id, tag, renk) VALUES (?, ?, ?)').run(doc.id, tag, renk);
              db.prepare(`INSERT INTO hareketler (evrak_id, islem_tipi, kullanici, "not") VALUES (?, 'otomasyon', 'Sistem', ?)`)
                .run(doc.id, `Alan rutini (${rutin.name}): "${tag}" etiketi eklendi.`);
            }
          }
          break;
        }
        case 'alan_guncelle': {
          if (rutin.hedefAlan) {
            const updated = setFieldValue(db, doc, rutin.hedefAlan, rutin.hedefDeger || '');
            if (updated) {
              db.prepare(`INSERT INTO hareketler (evrak_id, islem_tipi, kullanici, "not") VALUES (?, 'otomasyon', 'Sistem', ?)`)
                .run(doc.id, `Alan rutini (${rutin.name}): "${rutin.hedefAlan}" alanı güncellendi.`);
            }
          }
          break;
        }
        case 'log_ekle': {
          const logText = `Alan rutini tetiklendi: ${rutin.name} — ${field.label}: ${currentVal}`;
          db.prepare(`INSERT INTO hareketler (evrak_id, islem_tipi, kullanici, "not") VALUES (?, 'otomasyon', 'Sistem', ?)`)
            .run(doc.id, logText);
          break;
        }
        case 'dashboard_uyar':
          // Dashboard tarama (scanFieldRutins) ile ele alınır — burada ek işlem gerekmez
          break;
        default:
          break;
      }
    }
  }
}

/**
 * Tüm evrakları tarayıp tetiklenen alan rutinlerini döner.
 * Dashboard "Aktif Uyarılar" bölümü için kullanılır.
 */
export function scanAllFieldRutins(db, templates) {
  if (!db) return [];
  const results = [];

  const evraklar = db.prepare('SELECT * FROM evraklar').all();

  for (const evrak of evraklar) {
    // Evrakın şablonunu bul (metadata içindeki _templateId)
    let templateId = null;
    try {
      const meta = JSON.parse(evrak.metadata || '{}');
      templateId = meta._templateId;
    } catch {}

    if (!templateId) continue;
    const template = templates[templateId];
    if (!template || !Array.isArray(template.fields)) continue;

    for (const field of template.fields) {
      if (!Array.isArray(field.rutinler) || field.rutinler.length === 0) continue;

      const currentVal = getFieldValue(evrak, field.key);

      for (const rutin of field.rutinler) {
        const ruleObj = { field_name: field.key, operator: rutin.operator, value: rutin.value };
        const triggered = evaluateSingleRule(evrak, {}, ruleObj);
        if (!triggered) continue;

        // Kalan gün hesapla (tarih alanları için)
        let kalanGun = undefined;
        if (rutin.operator.startsWith('date_') && currentVal) {
          const fieldDate = new Date(currentVal);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          kalanGun = Math.ceil((fieldDate - today) / (1000 * 60 * 60 * 24));
        }

        results.push({
          evrak: { id: evrak.id, no: evrak.no, kurum: evrak.kurum, aciklama: evrak.aciklama },
          fieldKey: field.key,
          fieldLabel: field.label,
          rutin,
          value: currentVal !== undefined && currentVal !== null ? String(currentVal) : '',
          meta: kalanGun !== undefined ? { kalanGun } : undefined,
        });
      }
    }
  }

  // Önce kritik, sonra warn, sonra info; aynı seviyede en az kalan güne göre sırala
  const seviyeSira = { critical: 0, warn: 1, info: 2, undefined: 3 };
  results.sort((a, b) => {
    const sa = seviyeSira[a.rutin.seviye] ?? 3;
    const sb = seviyeSira[b.rutin.seviye] ?? 3;
    if (sa !== sb) return sa - sb;
    const ga = a.meta?.kalanGun ?? Infinity;
    const gb = b.meta?.kalanGun ?? Infinity;
    return ga - gb;
  });

  return results;
}
