/* DiscoverWorks exploration data model.
 *
 * The workbook is intentionally treated as an in-browser, read-only source.
 * This module keeps the public API small while retaining the source row grain.
 */

const DATA_SHEETS = [
  'Educator Clean',
  'Family - Family Level',
  'Family - Child Level',
  'Student Clean',
  'Site Level',
  'Grantee Level'
];

const GRAIN = {
  'Educator Clean': 'educator responses',
  'Family - Family Level': 'family responses',
  'Family - Child Level': 'child records',
  'Student Clean': 'student survey records',
  'Site Level': 'sites',
  'Grantee Level': 'grantees'
};

const VIEW_LABELS = {
  'Educator Clean': 'Educators',
  'Family - Family Level': 'Families — family questions',
  'Family - Child Level': 'Families — child questions',
  'Student Clean': 'Student Survey',
  'Site Level': 'Site characteristics',
  'Grantee Level': 'Grantee characteristics and support'
};

const NUMERIC_QUESTION_FIELDS = new Set([
  'program_days_numeric', 'average_program_day_length_numeric',
  'math_minutes_per_day_numeric', 'ela_minutes_per_day_numeric', 'enrichment_minutes_per_day_numeric'
]);
const NUMERIC_QUESTION_LABELS = {
  program_days_numeric: 'How many days of programming did the site offer?',
  average_program_day_length_numeric: 'Average program day length (hours)',
  math_minutes_per_day_numeric: 'Math instruction (minutes per day)',
  ela_minutes_per_day_numeric: 'ELA instruction (minutes per day)',
  enrichment_minutes_per_day_numeric: 'Enrichment activities (minutes per day)'
};

const IDENTITY_COLUMNS = new Set([
  'grantee_id', 'site_id', 'grantee_name', 'site_name', 'state', 'state_code',
  'grantee_code', 'site_code', 'grantee_bi', 'site_bi', 'anchor_partner',
  'district_id', 'student_linkit_id', 'final_temp_id', 'class_name',
  'student_grade', 'student_rising_grade', 'test_grade', 'child_number',
  'response_id', 'selected_site_label', 'site_match_source',
  'matched_qualtrics_site_dropdown_display_name',
  'matched_qualtrics_site_dropdown_source_type',
  'matched_qualtrics_site_dropdown_match_status'
]);

const METADATA_COLUMNS = new Set([
  'recorded_date', 'start_date', 'end_date', 'status', 'progress', 'finished',
  'duration_seconds', 'distribution_channel', 'user_language',
  '_source_id', '_source_system', '_source_spreadsheet_id', '_source_sheet_gid',
  '_source_sheet_name', '_source_row_number', '_extracted_at', 'clean_table_built_at'
]);

const QUALITY_PREFIXES = [
  'is_', 'has_', 'used_', 'site_review', 'matched_',
  'recaptcha', 'demographic_review', 'demographic_workbook_',
  'site_characteristics_', 'grantee_level_review'
];

const PROVENANCE_PREFIXES = [
  'source_', 'submittable_source_', 'po_feedback_source_',
  'site_characteristics_source_', 'demographic_source_', 'teacher_pay_source',
  'transportation_source', 'clean_table_'
];

const NARRATIVE_SUFFIXES = [
  '_text', '_text_original', '_text_scrubbed', '_original', '_scrubbed',
  '_reason', '_reflections', '_feedback', '_changes', '_recommendations',
  '_anything_else', '_value'
];

const STATIC_PARENT_COLUMNS = new Set([
  'family_engagement_methods', 'student_grade', 'student_survey_q9', 'student_survey_q10',
  'transportation_services', 'recruitment_strategies', 'attendance_strategies',
  'attendance_dropoff_factors', 'language_translation_accommodations',
  'special_ed_accommodations', 'staff_preparation', 'program_challenges',
  'assessment_support_areas', 'specific_activities_frequency',
  'instructional_approaches_frequency', 'rising_k_curriculum_materials',
  'rising_k_priorities', 'rising_k_student_selection', 'rising_k_worked_well',
  'rising_k_challenges', 'heard_about_program', 'wa_educator_post_survey_admin',
  'wa_family_post_survey_admin'
]);

const SEMANTIC_IDENTITY_FIELDS = new Set([
  'Educator Clean\u0000student_grade'
]);

const SURVEY_DIMENSION_FIELDS = new Set([
  'Educator Clean\u0000student_grade',
  'Student Clean\u0000student_rising_grade',
  'Student Clean\u0000participated_in_2025',
  'Student Clean\u0000participated_in_2024',
  'Family - Child Level\u0000grade',
  'Family - Child Level\u0000attended_last_year'
]);

const CATEGORICAL_NUMERIC_COLUMNS = new Set(['children_count']);

const MULTI_DIMENSION_COLUMNS = new Set(['transportation_services']);

// These Grantee Level fields are normalized answers from a categorical source
// form. They are useful survey questions even though the clean-table dictionary
// records them as derived fields.
const DERIVED_SEMANTIC_QUESTIONS = new Set([
  'program_support_understanding', 'program_support_fulfilling',
  'program_support_preparing', 'program_support_unexpected_challenges',
  'program_support_thought_partner', 'heard_about_program'
]);

const ONE_HOT_PREFIXES = [
  'student_grade_', 'family_engagement_', 'student_survey_q9_', 'student_survey_q10_',
  'heard_about_program_', 'transportation_services_', 'recruitment_strategies_',
  'attendance_strategies_', 'attendance_dropoff_factors_', 'language_translation_accommodations_',
  'special_ed_accommodations_', 'staff_preparation_', 'program_challenges_',
  'assessment_support_areas_', 'specific_activities_frequency_',
  'instructional_approaches_frequency_', 'rising_k_curriculum_materials_',
  'rising_k_priorities_', 'rising_k_student_selection_', 'rising_k_worked_well_',
  'rising_k_challenges_', 'wa_educator_post_survey_admin_', 'wa_family_post_survey_admin_',
  'attendance_dropoff_rank_', 'rising_k_priority_minutes_'
];

const STATIC_QUESTION_PREFIXES = {
  'Educator Clean': [
    'site_worked', 'instruction_type', 'academic_role', 'student_grade',
    'student_growth_', 'next_grade_prepared', 'implemented_lavinia_rise',
    'curriculum_type', 'high_quality_enrichment', 'family_engagement_',
    'adequate_training', 'access_resources', 'leadership_support',
    'safe_respectful_environment', 'job_satisfaction', 'participate_again',
    'school_year_teacher', 'teacher_experience', 'previous_summer_instructor'
  ],
  'Family - Family Level': [
    'reported_child_count_label', 'children_count', 'summer_alternative',
    'missed_days_', 'child_safe', 'supportive_environment', 'family_economic_impact_',
    'academic_progress_informed', 'communication_satisfaction', 'easy_to_contact_staff',
    'staff_communication_', 'recommend_likelihood', 'return_next_year', 'overall_quality',
    'mi_rising_k_age_appropriate'
  ],
  'Family - Child Level': [
    'reported_child_count_label', 'children_count', 'selected_site_label', 'grade',
    'attended_last_year', 'academic_development', 'personal_development',
    'school_year_preparedness', 'mi_rising_k_kindergarten_preparedness'
  ],
  'Student Clean': ['student_survey_q'],
  'Site Level': [
    'transportation_services', 'transportation_frequency', 'special_transportation',
    'program_days', 'average_program_day_length', 'math_minutes_per_day',
    'ela_minutes_per_day', 'enrichment_minutes_per_day', 'recruitment_strategies',
    'attendance_strategies', 'attendance_dropoff_factors', 'mi_half_day_', 'rising_k_',
    'mi_rising_10_offered', 'staff_preparation', 'student_teacher_ratio',
    'program_challenges', 'mi_organization_type', 'assessment_resources_helpfulness',
    'mi_lavinia_linkit_responsiveness', 'assessment_support_areas', 'assessment_confidence',
    'host_again_likelihood', 'q75', 'q76', 'q77'
  ],
  'Grantee Level': [
    'program_support_', 'heard_about_program', 'county', 'curriculum',
    'educational_service_district', 'program_support_feedback_source'
  ]
};

const SITE_DIMENSIONS = [
  ['state', 'State'], ['site_name', 'Site'], ['grantee_name', 'Grantee'],
  ['single_or_multisite', 'Single or multisite'], ['site_type', 'Site type'],
  ['site_structure', 'Site structure'], ['curriculum', 'Curriculum'],
  ['transportation_services', 'Transportation services'],
  ['transportation_frequency', 'Transportation frequency'],
  ['special_transportation', 'Special transportation'],
  ['student_teacher_ratio', 'Student teacher ratio'], ['program_days', 'Program days'],
  ['average_program_day_length', 'Average program day length'],
  ['mi_half_day_rising_9_10', 'Half-day rising 9–10 program'],
  ['mi_rising_k_offered', 'Rising K offered'], ['mi_rising_10_offered', 'Rising 10 offered'],
  ['mi_organization_type', 'Organization type'], ['educational_service_district', 'Educational service district'],
  ['county', 'County']
];

const GRANTEE_DIMENSIONS = [
  ['state', 'State'], ['grantee_name', 'Grantee'], ['single_or_multisite', 'Single or multisite'],
  ['site_type', 'Site type'], ['site_structure', 'Site structure'], ['curriculum', 'Curriculum'],
  ['county', 'County'], ['educational_service_district', 'Educational service district']
];

const NUMERIC_BANDS = [
  {
    base: 'program_days_numeric', id: 'program_days_numeric_band', label: 'Program days',
    bands: [{label: '<20', max: 20}, {label: '20–24', min: 20, max: 25}, {label: '25–29', min: 25, max: 30}, {label: '30+', min: 30}]
  },
  {
    base: 'average_program_day_length_numeric', id: 'average_program_day_length_numeric_band', label: 'Average program day length',
    bands: [{label: '<4 hours', max: 4}, {label: '4–<6 hours', min: 4, max: 6}, {label: '6+ hours', min: 6}]
  },
  {
    base: 'attendance_data_final_actual_enrollment_number', id: 'attendance_data_final_actual_enrollment_number_band', label: 'Final actual enrollment',
    bands: [{label: '<100', max: 100}, {label: '100–249', min: 100, max: 250}, {label: '250–499', min: 250, max: 500}, {label: '500+', min: 500}]
  }
];

const ORDINAL_WORDS = [
  ['strongly disagree', 0], ['very dissatisfied', 0], ['very poor', 0], ['not at all', 0],
  ['disagree', 1], ['dissatisfied', 1], ['poor', 1], ['slightly', 1],
  ['neutral', 2], ['neither', 2], ['somewhat', 2], ['moderately', 2],
  ['agree', 3], ['satisfied', 3], ['good', 3], ['quite', 3],
  ['strongly agree', 4], ['very satisfied', 4], ['very good', 4], ['extremely', 4]
];

function trim(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function nonblank(value) {
  return value !== null && value !== undefined && trim(value) !== '';
}

function normalizeKey(value) {
  return trim(value).toLowerCase();
}

function humanize(id) {
  return trim(id).replace(/^student_survey_/, '').replace(/_/g, ' ').replace(/\s+/g, ' ')
    .replace(/\b\w/g, m => m.toUpperCase());
}

function startsAny(value, prefixes) {
  return prefixes.some(prefix => value === prefix || value.startsWith(prefix));
}

function isNarrative(meta, column) {
  const note = `${meta?.notes || ''} ${meta?.transformation || ''}`.toLowerCase();
  if (/open-text|open response|original response|scrubbed response|helper field|excluded from/.test(note)) return true;
  if (/^optional:|please share|please explain|what changes|anything else|what worked well|what challenges/.test((meta?.description || '').trim().toLowerCase())) return true;
  if (NARRATIVE_SUFFIXES.some(suffix => column.endsWith(suffix))) return true;
  return false;
}

function isOneHot(meta, column) {
  if (STATIC_PARENT_COLUMNS.has(column)) return false;
  const note = `${meta?.notes || ''} ${meta?.transformation || ''}`.toLowerCase();
  return /one-hot|selected-choice|selection values|1 = selected/.test(note)
    || ONE_HOT_PREFIXES.some(prefix => column.startsWith(prefix) && column !== prefix.slice(0, -1));
}

function splitSemicolon(value) {
  if (!nonblank(value)) return [];
  return String(value).split(';').map(item => item.trim()).filter(Boolean);
}

function isSelected(value) {
  if (value === true || value === 1) return true;
  const s = normalizeKey(value);
  return ['1', 'true', 'yes', 'selected', 'checked'].includes(s);
}

function isZero(value) {
  return value === 0 || normalizeKey(value) === '0' || normalizeKey(value) === 'false' || normalizeKey(value) === 'no';
}

function parseNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const n = Number(trim(value).replace(/,/g, ''));
  return Number.isFinite(n) && trim(value) !== '' ? n : null;
}

function dictionarySheet(tables) {
  return Object.keys(tables || {}).find(name => /^(data\s+dictionary|dictionary)$/i.test(name.trim())) || null;
}

function parseDictionary(tables) {
  const name = dictionarySheet(tables);
  const rows = name && Array.isArray(tables[name]) ? tables[name] : [];
  if (!rows.length) return new Map();
  const header = rows[0].map((v, i) => trim(v) || `column_${i}`);
  const index = Object.fromEntries(header.map((v, i) => [normalizeKey(v), i]));
  const at = (...names) => names.map(normalizeKey).map(n => index[n]).find(i => i !== undefined);
  const sheetAt = at('Sheet', 'Sheet Name');
  const columnAt = at('Column', 'Field', 'Field Name');
  const descAt = at('Description or Question', 'Description', 'Question');
  const itemAt = at('Question Item / Notes', 'Item', 'Notes');
  const categoryAt = at('Category', 'Field Category');
  const typeAt = at('BigQuery Type', 'Type');
  const transformAt = at('Transformation');
  const qidAt = at('Qualtrics QID');
  const byKey = new Map();
  rows.slice(1).forEach(row => {
    const sheet = sheetAt === undefined ? '' : trim(row[sheetAt]);
    const column = columnAt === undefined ? '' : trim(row[columnAt]);
    if (!sheet || !column) return;
    byKey.set(`${sheet}\u0000${column}`, {
      sheet, column,
      description: descAt === undefined ? '' : trim(row[descAt]),
      notes: itemAt === undefined ? '' : trim(row[itemAt]),
      category: categoryAt === undefined ? '' : trim(row[categoryAt]),
      type: typeAt === undefined ? '' : trim(row[typeAt]),
      transformation: transformAt === undefined ? '' : trim(row[transformAt]),
      qid: qidAt === undefined ? '' : trim(row[qidAt])
    });
  });
  return byKey;
}

function headerMap(rows) {
  const headers = Array.isArray(rows) && rows.length ? rows[0].map((v, i) => trim(v) || `column_${i}`) : [];
  const data = (Array.isArray(rows) ? rows.slice(1) : []).map(values => {
    const row = {};
    headers.forEach((header, i) => { row[header] = values?.[i] ?? ''; });
    return row;
  });
  return {headers, data};
}

function fallbackMeta(sheet, column) {
  return {sheet, column, description: humanize(column), notes: '', category: '', type: '', transformation: '', qid: ''};
}

function isFallbackQuestion(sheet, column) {
  if ((IDENTITY_COLUMNS.has(column) && !SEMANTIC_IDENTITY_FIELDS.has(`${sheet}\u0000${column}`)) || METADATA_COLUMNS.has(column)) return false;
  if (column.endsWith('_source') || column.endsWith('_source_id')) return false;
  if (startsAny(column, QUALITY_PREFIXES) || startsAny(column, PROVENANCE_PREFIXES)) return false;
  if (isNarrative({description: '', notes: '', transformation: ''}, column)) return false;
  if (sheet === 'Student Clean') return column.startsWith('student_survey_q');
  const prefixes = STATIC_QUESTION_PREFIXES[sheet] || [];
  return prefixes.some(prefix => column === prefix || column.startsWith(prefix));
}

function semanticQuestion(sheet, column, meta) {
  const category = normalizeKey(meta.category);
  if (sheet === 'Site Level' && NUMERIC_QUESTION_FIELDS.has(column)) return true;
  if (isNarrative(meta, column)) return false;
  if ((IDENTITY_COLUMNS.has(column) && !SEMANTIC_IDENTITY_FIELDS.has(`${sheet}\u0000${column}`)) || METADATA_COLUMNS.has(column)) return false;
  if (column.endsWith('_source') || column.endsWith('_source_id')) return false;
  if (startsAny(column, QUALITY_PREFIXES) || startsAny(column, PROVENANCE_PREFIXES)) return false;
  if (sheet === 'Student Clean') return column.startsWith('student_survey_q');
  if (DERIVED_SEMANTIC_QUESTIONS.has(column)) return true;
  if (category) return category === 'survey question';
  return isFallbackQuestion(sheet, column);
}

function meaningfulItem(meta) {
  const item = trim(meta.notes);
  if (!item) return '';
  if (/^(response codes|binary indicator|selected-choice|selected-choice field|open-text|helper field|original response|scrubbed response|normalized|qualtrics metadata|quality field|canonical mgt|source used|whether|number of|count of|timestamp|derived)/i.test(item)) return '';
  if (/excluded from the published data|selection values are retained/i.test(item)) return '';
  return item.replace(/\s*—\s*text response.*$/i, '').trim();
}

function makeLabel(meta, fallbackId) {
  const description = trim(meta.description) || humanize(fallbackId);
  const item = meaningfulItem(meta);
  if (!item || normalizeKey(description).includes(normalizeKey(item))) return description;
  return `${description} — ${item}`;
}

function optionLabel(meta, column, parent) {
  const note = trim(meta.notes);
  const selected = note.match(/(?:selected-choice(?: field)?|selection values[^:]*):\s*(.+?)(?:\.|$)/i);
  if (selected) return selected[1].trim();
  const item = meaningfulItem(meta);
  if (item) return item;
  const description = trim(meta.description);
  const parentDescription = trim(parent?.description);
  if (parentDescription && description.startsWith(parentDescription)) return description.slice(parentDescription.length).replace(/^\s*[.:]\s*/, '').trim();
  if (column.startsWith(`${parent?.column || ''}_`)) return humanize(column.slice((parent.column || '').length + 1));
  return humanize(column);
}

function staticGroup(column) {
  if (column.startsWith('student_survey_q9_')) return 'student_survey_q9';
  if (column.startsWith('student_survey_q10_')) return 'student_survey_q10';
  const known = ONE_HOT_PREFIXES.find(prefix => column.startsWith(prefix) && column !== prefix);
  if (!known) return '';
  const stem = column.slice(0, known.length - 1);
  return stem || '';
}

function inferType(meta, field) {
  if (field.columns?.length > 0) return 'multi';
  if (CATEGORICAL_NUMERIC_COLUMNS.has(field.column || field.id)) return 'categorical';
  const type = normalizeKey(meta.type);
  if (type.includes('bool')) return 'categorical';
  if (type.includes('int') || type.includes('float') || type.includes('numeric') || type.includes('double')) return 'numeric';
  const text = `${meta.description} ${meta.notes}`.toLowerCase();
  if (/select all|check all|multiple choice/.test(text)) return 'multi';
  return 'categorical';
}

function explicitResponseOrder(sheet, column) {
  if (sheet !== 'Student Clean') return null;
  if (column.startsWith('student_survey_q1_')) return ['Bad', 'Okay', 'Good', 'Great', 'Amazing'];
  if (/^student_survey_q[2-8]_/.test(column)) return ['Not at all', 'Not really', 'Kind of', 'Definitely', 'Absolutely'];
  return null;
}

function longestCommonPrefix(values) {
  if (!values.length) return '';
  let prefix = values[0];
  values.slice(1).forEach(value => {
    let n = 0;
    while (n < prefix.length && n < value.length && prefix[n] === value[n]) n += 1;
    prefix = prefix.slice(0, n);
  });
  return prefix;
}

function groupLabel(metas, representative) {
  if (representative.column.startsWith('student_survey_q9_')) return 'What did the adults at your summer program do that made you feel cared about? (Check all that apply.)';
  if (representative.column.startsWith('student_survey_q10_')) return 'What were the reasons you did not go to the summer program? (Check all that apply.)';
  const descriptions = metas.map(meta => trim(meta.description)).filter(Boolean);
  if (!descriptions.length) return makeLabel(representative, representative.column);
  const common = longestCommonPrefix(descriptions);
  if (common.length >= 24) {
    const cut = common.lastIndexOf(')');
    if (cut >= 12) return common.slice(0, cut + 1).trim();
    const dot = common.lastIndexOf('.');
    if (dot >= 12) return common.slice(0, dot + 1).trim();
  }
  const q9 = representative.column.startsWith('student_survey_q9_');
  const q10 = representative.column.startsWith('student_survey_q10_');
  if (q9) return 'What did the adults at your summer program do that made you feel cared about?';
  if (q10) return 'What were the reasons you did not go to the summer program?';
  return makeLabel(representative, representative.column);
}

function buildFields(sheet, headers, dictionary, rows = []) {
  const metas = headers.map(column => dictionary.get(`${sheet}\u0000${column}`) || fallbackMeta(sheet, column));
  const byColumn = new Map(metas.map(meta => [meta.column, meta]));
  const candidate = metas.filter(meta => semanticQuestion(sheet, meta.column, meta)
    || SURVEY_DIMENSION_FIELDS.has(`${sheet}\u0000${meta.column}`));
  const oneHot = candidate.filter(meta => isOneHot(meta, meta.column));
  const groups = new Map();
  const hidden = new Set();

  oneHot.forEach(meta => {
    let groupId = '';
    const sameDescription = candidate.filter(other => !isOneHot(other, other.column)
      && normalizeKey(other.description) && normalizeKey(other.description) === normalizeKey(meta.description));
    if (sameDescription.length) groupId = sameDescription.sort((a, b) => a.column.length - b.column.length)[0].column;
    if (!groupId) groupId = staticGroup(meta.column);
    if (!groupId) return;
    if (!byColumn.has(groupId)) {
      const parent = candidate.filter(other => !isOneHot(other, other.column)
        && (other.column === groupId || other.column.startsWith(`${groupId}_`)))
        .sort((a, b) => a.column.length - b.column.length)[0];
      if (parent) groupId = parent.column;
    }
    if (!groups.has(groupId)) groups.set(groupId, {parent: byColumn.get(groupId) || null, children: []});
    groups.get(groupId).children.push(meta);
    hidden.add(meta.column);
  });

  const fields = [];
  candidate.forEach(meta => {
    if (hidden.has(meta.column)) return;
    const group = groups.get(meta.column);
    const field = {
      id: meta.column,
      label: NUMERIC_QUESTION_LABELS[meta.column] || makeLabel(meta, meta.column),
      type: 'categorical',
      source: 'survey',
      column: meta.column,
      order: fields.length,
      question: semanticQuestion(sheet, meta.column, meta),
      dimension: SURVEY_DIMENSION_FIELDS.has(`${sheet}\u0000${meta.column}`),
      boolean: normalizeKey(meta.type).includes('bool'),
      responseOrder: explicitResponseOrder(sheet, meta.column),
      qid: meta.qid || undefined
    };
    if (group?.children?.length) {
      field.columns = group.children.map(child => child.column);
      field.options = group.children.map(child => optionLabel(child, child.column, meta));
      field.optionMap = Object.fromEntries(group.children.map(child => [child.column, optionLabel(child, child.column, meta)]));
      field.type = 'multi';
    }
    field.type = inferType(meta, field);
    fields.push(field);
  });

  groups.forEach((group, groupId) => {
    if (group.parent || fields.some(field => field.id === groupId)) return;
    const representative = group.children[0];
    const field = {
      id: groupId,
      label: groupLabel(group.children, representative),
      type: 'multi', source: 'survey', columns: group.children.map(child => child.column),
      options: group.children.map(child => optionLabel(child, child.column, representative)),
      optionMap: Object.fromEntries(group.children.map(child => [child.column, optionLabel(child, child.column, representative)])),
      order: fields.length, question: true, qid: representative.qid || undefined
    };
    fields.push(field);
  });

  return fields.sort((a, b) => a.order - b.order).map((field, order) => {
    if (field.type === 'categorical' && field.column && rows.some(row => typeof row[field.column] === 'string' && row[field.column].includes(';'))) field.type = 'multi';
    return {...field, order};
  });
}

function buildDimensionFields(model, source) {
  const tableName = source === 'site' ? 'Site Level' : 'Grantee Level';
  const table = model._tables[tableName];
  if (!table) return [];
  const available = new Set(table.headers);
  const definitions = source === 'site' ? SITE_DIMENSIONS : GRANTEE_DIMENSIONS;
  const fields = definitions.filter(([column]) => available.has(column)
    && !(column === 'program_days' && available.has('program_days_numeric'))
    && !(column === 'average_program_day_length' && available.has('average_program_day_length_numeric'))).map(([column, label], order) => ({
    id: column, label, type: MULTI_DIMENSION_COLUMNS.has(column) || table.data.some(row => typeof row[column] === 'string' && row[column].includes(';')) ? 'multi' : 'categorical', source, column, order, dimension: true
  }));
  NUMERIC_BANDS.forEach(band => {
    if (available.has(band.base)) {
      fields.push({id: band.id, label: band.label, type: 'categorical', band: true, source, column: band.base,
        columns: [band.base], bands: band.bands, order: fields.length, dimension: true});
    }
  });
  return fields;
}

function makeStudentCohort(rows, headers) {
  const surveyColumns = headers.filter(column => column.startsWith('student_survey_q'));
  const availableColumn = headers.includes('survey_available') ? 'survey_available' : '';
  return rows.filter(row => {
    const available = availableColumn && /^(available|yes|true|1|complete|completed)$/i.test(trim(row[availableColumn]));
    const answered = surveyColumns.some(column => nonblank(row[column]));
    return Boolean(available || answered);
  });
}

function normalizeTableName(name, tables) {
  if (tables[name]) return name;
  return Object.keys(tables).find(key => normalizeKey(key) === normalizeKey(name)) || name;
}

function createModel(tables = {}) {
  const dictionary = parseDictionary(tables);
  const normalized = {};
  DATA_SHEETS.forEach(expected => {
    const name = normalizeTableName(expected, tables);
    const raw = tables[name];
    if (!Array.isArray(raw) || !raw.length) return;
    const table = headerMap(raw);
    normalized[expected] = table;
  });
  const model = {
    version: 1,
    tables,
    _tables: normalized,
    _dictionary: dictionary,
    _entriesCache: new Map(),
    _viewRows: new Map(),
    views: []
  };

  DATA_SHEETS.forEach(name => {
    const table = normalized[name];
    if (!table) return;
    const rawRows = table.data;
    const rows = name === 'Student Clean' ? makeStudentCohort(rawRows, table.headers) : rawRows;
    const surveyFields = buildFields(name, table.headers, dictionary, rawRows);
    const questions = surveyFields.filter(field => field.question).sort((a, b) => Number(a.id === 'site_worked') - Number(b.id === 'site_worked'));
    model.views.push({
      id: name,
      label: VIEW_LABELS[name],
      grain: GRAIN[name],
      questions,
      fields: surveyFields,
      rowCount: rawRows.length,
      cohortRowCount: rows.length,
      cohortNote: name === 'Student Clean'
        ? 'Includes student survey records marked Available or with an answer to Q1–Q10. Each source row is retained; counts are records in this survey cohort rather than deduplicated students.'
        : '',
    });
    model._viewRows.set(name, rows);
  });
  return model;
}

function getView(model, id) {
  return (model?.views || []).find(view => view.id === id) || null;
}

function getFields(model, viewId, source = 'survey') {
  const view = getView(model, viewId);
  if (!view) return [];
  if (source === 'survey') return view.fields.filter(field => field.type !== 'numeric').map(field => ({...field}));
  if (source === 'site' || source === 'grantee') return buildDimensionFields(model, source).map(field => ({...field}));
  return [];
}

function uniqueIndex(rows, column) {
  const groups = new Map();
  rows.forEach(row => {
    const key = trim(row[column]);
    if (!key) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });
  const unique = new Map();
  const duplicate = new Set();
  groups.forEach((items, key) => {
    if (items.length === 1) unique.set(key, items[0]);
    else duplicate.add(key);
  });
  return {unique, duplicate, groups};
}

function idValue(row, ...columns) {
  for (const column of columns) {
    if (nonblank(row?.[column])) return trim(row[column]);
  }
  return '';
}

function familyIds(row, viewId) {
  if (viewId === 'Family - Family Level') {
    // The clean family table already contains the validated top-level IDs.
    // Child slot values are retained for audit context and are not re-derived
    // here because blank slots and reported child counts can be intentional.
    const siteId = idValue(row, 'site_id');
    const granteeId = idValue(row, 'grantee_id');
    const siteMultiple = parseNumber(row.distinct_child_site_count) > 1;
    const granteeMultiple = parseNumber(row.distinct_child_grantee_count) > 1;
    return {
      siteId, siteAmbiguous: siteMultiple, multiple: siteMultiple,
      granteeId, granteeAmbiguous: granteeMultiple, multipleGrantee: granteeMultiple
    };
  }
  const siteId = idValue(row, viewId === 'Student Clean' ? 'site_code' : 'site_id');
  const granteeId = idValue(row, viewId === 'Student Clean' ? 'grantee_code' : 'grantee_id');
  return {siteId, siteAmbiguous: false, multiple: false, granteeId, granteeAmbiguous: false, multipleGrantee: false};
}

function studentIncluded(view, row) {
  if (view.id !== 'Student Clean') return true;
  const available = /^(available|yes|true|1|complete|completed)$/i.test(trim(row.survey_available));
  const answered = Object.keys(row).some(column => column.startsWith('student_survey_q') && nonblank(row[column]));
  return available || answered;
}

function getEntries(model, viewId) {
  const view = getView(model, viewId);
  if (!view) return {entries: [], diagnostics: {total: 0, siteMatched: 0, siteMissing: 0, siteAmbiguous: 0, granteeMatched: 0, granteeMissing: 0, granteeAmbiguous: 0}};
  if (model._entriesCache.has(viewId)) return model._entriesCache.get(viewId);
  const siteTable = model._tables['Site Level'];
  const granteeTable = model._tables['Grantee Level'];
  const siteIndex = uniqueIndex(siteTable?.data || [], 'site_id');
  const granteeIndex = uniqueIndex(granteeTable?.data || [], 'grantee_id');
  const diagnostics = {
    total: 0, siteMatched: 0, siteMissing: 0, siteAmbiguous: 0,
    granteeMatched: 0, granteeMissing: 0, granteeAmbiguous: 0,
    multipleSiteFamilies: 0, multipleGranteeFamilies: 0
  };
  const entries = [];
  (model._viewRows.get(viewId) || []).forEach((record, index) => {
    if (!studentIncluded(view, record)) return;
    diagnostics.total += 1;
    let site = null;
    let grantee = null;
    let ids;
    if (viewId === 'Site Level') {
      ids = {siteId: idValue(record, 'site_id'), granteeId: idValue(record, 'grantee_id'), siteAmbiguous: false, granteeAmbiguous: false, multiple: false, multipleGrantee: false};
      site = record;
    } else if (viewId === 'Grantee Level') {
      ids = {siteId: '', granteeId: idValue(record, 'grantee_id'), siteAmbiguous: false, granteeAmbiguous: false, multiple: false, multipleGrantee: false};
      grantee = record;
    } else {
      ids = familyIds(record, viewId);
    }
    if (ids.multiple) diagnostics.multipleSiteFamilies += 1;
    if (ids.multipleGrantee) diagnostics.multipleGranteeFamilies += 1;
    if (viewId !== 'Grantee Level') {
      if (ids.siteAmbiguous) diagnostics.siteAmbiguous += 1;
      else if (ids.siteId && siteIndex.duplicate.has(ids.siteId)) diagnostics.siteAmbiguous += 1;
      else if (site && ids.siteId) diagnostics.siteMatched += 1;
      else if (ids.siteId && siteIndex.unique.has(ids.siteId)) { site = siteIndex.unique.get(ids.siteId); diagnostics.siteMatched += 1; }
      else diagnostics.siteMissing += 1;
    }

    if (ids.granteeAmbiguous) diagnostics.granteeAmbiguous += 1;
    else if (ids.granteeId && granteeIndex.duplicate.has(ids.granteeId)) diagnostics.granteeAmbiguous += 1;
    else if (grantee && ids.granteeId) diagnostics.granteeMatched += 1;
    else if (ids.granteeId && granteeIndex.unique.has(ids.granteeId)) { grantee = granteeIndex.unique.get(ids.granteeId); diagnostics.granteeMatched += 1; }
    else diagnostics.granteeMissing += 1;
    entries.push({record, site, grantee, siteId: ids.siteId, granteeId: ids.granteeId, sourceRow: index + 2});
  });
  const result = {entries, diagnostics, cohortNote: view.cohortNote || ''};
  model._entriesCache.set(viewId, result);
  return result;
}

function sourceRecord(entry, field) {
  if (!entry) return {};
  if (field?.source === 'site') return entry.site || {};
  if (field?.source === 'grantee') return entry.grantee || {};
  return entry.record || entry;
}

function bandLabel(value, field) {
  const number = parseNumber(value);
  if (number === null || !field?.bands) return [];
  const match = field.bands.find(band => (band.min === undefined || number >= band.min) && (band.max === undefined || number < band.max));
  return match ? [match.label] : [];
}

function getFieldValues(entry, field) {
  if (!field) return [];
  const row = sourceRecord(entry, field);
  if (field.band) return bandLabel(row[field.column], field);
  if (field.columns?.length) {
    const direct = field.column && row[field.column];
    if (nonblank(direct)) return [...new Set(splitSemicolon(direct))];
    const labels = [];
    field.columns.forEach(column => {
      if (isSelected(row[column])) labels.push(field.optionMap?.[column] || humanize(column));
    });
    return [...new Set(labels)];
  }
  const value = row[field.column || field.id];
  if (!nonblank(value)) return [];
  if (field.type === 'multi' || (typeof value === 'string' && value.includes(';'))) return [...new Set(splitSemicolon(value))];
  if (field.type === 'numeric') return parseNumber(value) === null ? [] : [String(parseNumber(value))];
  if (field.boolean || typeof value === 'boolean') return [isSelected(value) ? 'Yes' : 'No'];
  return [String(value).trim()];
}

function hasAnswer(entry, field) {
  if (!field) return false;
  const row = sourceRecord(entry, field);
  if (field.band) return bandLabel(row[field.column], field).length > 0;
  if (field.columns?.length) {
    if (field.column && nonblank(row[field.column])) return true;
    return field.columns.some(column => nonblank(row[column]));
  }
  const value = row[field.column || field.id];
  if (field.type === 'numeric') return parseNumber(value) !== null;
  return nonblank(value);
}

function ordinalRank(label) {
  const text = normalizeKey(label);
  for (const [word, rank] of ORDINAL_WORDS) if (text.includes(word)) return rank;
  const grade = text.match(/(?:rising\s*)?k\b/);
  if (grade) return 0;
  const gradeNumber = text.match(/(?:rising\s*|grade\s*|^)(\d+)/);
  if (gradeNumber) return Number(gradeNumber[1]) + 10;
  const number = text.match(/-?\d+(?:\.\d+)?/);
  return number ? Number(number[0]) + 100 : null;
}

function orderLabels(labels, field) {
  const unique = [...new Set((labels || []).map(label => String(label)))];
  const responseOrder = field?.responseOrder
    || (field?.bands?.length ? field.bands.map(band => band.label) : null)
    || (Array.isArray(field?.options) ? field.options : null);
  if (responseOrder?.length && unique.every(label => responseOrder.includes(label))) {
    const ranks = new Map(responseOrder.map((label, index) => [String(label), index]));
    return unique.sort((a, b) => ranks.get(a) - ranks.get(b));
  }
  return unique.sort((a, b) => {
    const ar = ordinalRank(a);
    const br = ordinalRank(b);
    if (ar !== null && br !== null && ar !== br) return ar - br;
    if (ar !== null && br === null) return -1;
    if (ar === null && br !== null) return 1;
    return a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'});
  });
}

export {createModel, getView, getFields, getEntries, getFieldValues, hasAnswer, orderLabels};
