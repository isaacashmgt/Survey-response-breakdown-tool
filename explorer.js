import { createModel, getView, getFields, getEntries, getFieldValues, hasAnswer, orderLabels } from './explorer-data.js?v=20261008-3';

const $ = id => document.getElementById(id);
const number = value => Number(value).toLocaleString('en-US', { maximumFractionDigits: 1 });
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MISSING = '__missing_breakdown__';
const COLORS = ['#087f73', '#438ec4', '#e0a44a', '#9675b7', '#cc7286', '#699d69', '#677f98', '#c78251', '#59aab0', '#9a9d56', '#7d88c7', '#b37b9e'];
let model = null;
let fileName = '';
let currentView = '';
let mode = 'table';
let context = null;
let observer = null;
let filterSequence = 0;
let renderSequence = 0;
let loading = false;
const preferences = new Map();
const entryCache = new Map();
const charts = new Map();
const questionStats = new Map();

function settings() {
  if (!preferences.has(currentView)) preferences.set(currentView, { source: 'none', field: '', filters: [], search: '' });
  return preferences.get(currentView);
}

function fields(source) { return getFields(model, currentView, source) || []; }
function findField(source, id) { return fields(source).find(field => field.id === id); }
function sourceLabel(source) { return ({ survey: 'Same survey', site: 'Site characteristic', grantee: 'Grantee characteristic', none: 'Overall' })[source]; }
function labels(entry, field, includeMissing = false) {
  const values = [...new Set(getFieldValues(entry, field).map(String).filter(value => value.trim()))];
  return values.length ? values : (includeMissing ? [MISSING] : []);
}
function readable(value) { return value === MISSING ? 'Missing / unresolved' : value; }
function optionList(items, selected, placeholder = null) {
  return `${placeholder !== null ? `<option value="">${escape(placeholder)}</option>` : ''}${items.map(item => `<option value="${escape(item.id)}" ${item.id === selected ? 'selected' : ''}>${escape(item.label)}</option>`).join('')}`;
}

async function loadWorkbook(file) {
  if (!file || loading) return;
  if (!/\.xlsx$/i.test(file.name)) return uploadStatus('Download the full Google workbook as Microsoft Excel (.xlsx), then upload that file.', true);
  loading = true;
  uploadStatus('Opening the workbook… Allow a minute for the full file to load.');
  $('fileInput').disabled = true;
  try {
    const buffer = await file.arrayBuffer();
    const tables = await new Promise((resolve, reject) => {
      const worker = new Worker('explorer-worker.js?v=20261008-3');
      worker.onmessage = ({ data }) => {
        if (data.type === 'progress') uploadStatus(data.message);
        if (data.type === 'success') { worker.terminate(); resolve(data.tables); }
        if (data.type === 'error') { worker.terminate(); reject(new Error(data.message)); }
      };
      worker.onerror = () => { worker.terminate(); reject(new Error('The workbook reader could not start. Check your connection and try again.')); };
      worker.postMessage({ buffer }, [buffer]);
    });
    uploadStatus('Preparing the survey questions…');
    await new Promise(resolve => requestAnimationFrame(resolve));
    const nextModel = createModel(tables);
    if (!nextModel.views?.length) throw new Error('No DiscoverWorks data tabs were found. Download the full linked team workbook, keeping all tabs together.');
    destroyCharts();
    model = nextModel;
    fileName = file.name;
    preferences.clear(); entryCache.clear();
    currentView = model.views[0].id;
    $('surveySelect').innerHTML = optionList(model.views, currentView);
    $('workbookName').textContent = fileName;
    const statusRows = tables['Refresh Status'] || [];
    const dateColumns = (statusRows[0] || []).map((value, index) => /publish|refresh|source.*modified/i.test(String(value)) ? index : -1).filter(index => index >= 0);
    const dates = statusRows.slice(1).flatMap(row => dateColumns.map(index => String(row[index] || ''))).filter(value => /^20\d\d[-/]/.test(value)).map(value => value.slice(0, 10)).sort();
    $('workbookDate').textContent = dates.length ? `· Source/publication dates ${dates[0]}${dates.at(-1) !== dates[0] ? ` – ${dates.at(-1)}` : ''} (UTC)` : '';
    $('uploadPanel').classList.add('hidden');
    $('explorer').classList.remove('hidden');
    syncControls(); renderAnalysis();
    window.scrollTo({ top: 0 });
  } catch (error) {
    uploadStatus(error.message || 'The workbook could not be opened. Please try again.', true);
  } finally {
    loading = false; $('fileInput').disabled = false; $('fileInput').value = '';
  }
}

function uploadStatus(message, error = false) {
  $('statusMessage').textContent = message;
  $('statusMessage').classList.toggle('error', error);
  $('statusMessage').classList.toggle('loading', !error && Boolean(message));
}

function syncControls() {
  const prefs = settings();
  const siteSource = $('breakdownSource').querySelector('option[value="site"]');
  siteSource.disabled = currentView === 'Grantee Level';
  siteSource.textContent = currentView === 'Grantee Level' ? 'Site characteristic — use a response/site view' : 'Site characteristic';
  if (currentView === 'Grantee Level' && prefs.source === 'site') { prefs.source = 'none'; prefs.field = ''; }
  $('surveySelect').value = currentView;
  $('breakdownSource').value = prefs.source;
  $('breakdownFieldWrap').classList.toggle('hidden', prefs.source === 'none');
  if (prefs.source !== 'none') {
    const list = fields(prefs.source);
    if (!list.some(field => field.id === prefs.field)) prefs.field = '';
    $('breakdownField').innerHTML = optionList(list, prefs.field, list.length ? 'Choose a question or characteristic' : 'No characteristics available in this workbook');
  }
  $('questionSearch').value = prefs.search;
  renderFilters();
}

function entriesForView() {
  if (!entryCache.has(currentView)) entryCache.set(currentView, getEntries(model, currentView));
  return entryCache.get(currentView);
}

function allFilterValues(field) {
  const values = new Set();
  entriesForView().entries.forEach(entry => labels(entry, field, true).forEach(value => values.add(value)));
  return [...orderLabels([...values].filter(value => value !== MISSING), field), ...(values.has(MISSING) ? [MISSING] : [])];
}

function renderFilters() {
  const list = $('filterList'); list.replaceChildren();
  settings().filters.forEach(filter => {
    const element = document.createElement('div'); element.className = 'explorer-filter';
    element.innerHTML = `<div class="filter-top"><label class="field"><span>Filter source</span><select class="filter-source"><option value="survey">Same survey</option><option value="site">Site characteristic</option><option value="grantee">Grantee characteristic</option></select></label><label class="field"><span>Question / characteristic</span><select class="filter-field"></select></label><button class="ghost-btn remove-filter" type="button" aria-label="Remove filter">Remove</button></div><input class="filter-values-search" type="search" placeholder="Find a value" aria-label="Find filter values"><div class="filter-values-options"></div><p class="filter-selection-note">No selected values = all values.</p>`;
    const sourceSelect = element.querySelector('.filter-source'); sourceSelect.value = filter.source;
    sourceSelect.querySelector('option[value="site"]').disabled = currentView === 'Grantee Level';
    const fieldSelect = element.querySelector('.filter-field'); fieldSelect.innerHTML = optionList(fields(filter.source), filter.field, 'Choose a question or characteristic');
    sourceSelect.addEventListener('change', () => { filter.source = sourceSelect.value; filter.field = ''; filter.values.clear(); renderFilters(); renderAnalysis(); });
    fieldSelect.addEventListener('change', () => { filter.field = fieldSelect.value; filter.values.clear(); renderFilterValues(element, filter); renderAnalysis(); });
    element.querySelector('.remove-filter').addEventListener('click', () => { settings().filters = settings().filters.filter(item => item.id !== filter.id); renderFilters(); renderAnalysis(); });
    element.querySelector('.filter-values-search').addEventListener('input', () => renderFilterValues(element, filter));
    renderFilterValues(element, filter); list.append(element);
  });
}

function renderFilterValues(element, filter) {
  const field = findField(filter.source, filter.field);
  const searchInput = element.querySelector('.filter-values-search');
  const valuesWrap = element.querySelector('.filter-values-options');
  valuesWrap.replaceChildren(); searchInput.classList.toggle('hidden', !field);
  if (!field) return;
  const query = searchInput.value.trim().toLowerCase();
  const values = allFilterValues(field).filter(value => readable(value).toLowerCase().includes(query));
  for (const value of values) {
    const label = document.createElement('label');
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = filter.values.has(value);
    checkbox.addEventListener('change', () => { if (checkbox.checked) filter.values.add(value); else filter.values.delete(value); renderAnalysis(); });
    label.append(checkbox, document.createTextNode(readable(value))); valuesWrap.append(label);
  }
  if (!values.length) valuesWrap.textContent = 'No matching values.';
}

function activeFilters() { return settings().filters.filter(filter => filter.values.size && findField(filter.source, filter.field)); }
function filterDescription(filter) { return `${findField(filter.source, filter.field).label}: ${[...filter.values].map(readable).join(', ')}`; }

function buildContext() {
  const view = getView(model, currentView);
  const base = entriesForView();
  const filters = activeFilters().map(filter => ({ ...filter, definition: findField(filter.source, filter.field) }));
  const cohort = base.entries.filter(entry => filters.every(filter => labels(entry, filter.definition, true).some(value => filter.values.has(value))));
  const breakdown = settings().source === 'none' ? null : findField(settings().source, settings().field);
  const buckets = new Map();
  cohort.forEach(entry => {
    const values = breakdown ? labels(entry, breakdown, true) : ['Overall'];
    values.forEach(value => { if (!buckets.has(value)) buckets.set(value, []); buckets.get(value).push(entry); });
  });
  const keys = breakdown ? [...orderLabels([...buckets.keys()].filter(key => key !== MISSING), breakdown), ...(buckets.has(MISSING) ? [MISSING] : [])] : [...buckets.keys()];
  return { view, base, cohort, breakdown, groups: keys.map(key => ({ key, label: readable(key), entries: buckets.get(key) })), filters };
}

function destroyCharts() { observer?.disconnect(); charts.forEach(chart => chart.destroy()); charts.clear(); }
function matchingQuestions() {
  const query = settings().search.trim().toLowerCase();
  return context.view.questions.filter(question => question.label.toLowerCase().includes(query));
}

function renderAnalysis() {
  if (!model) return;
  context = buildContext(); questionStats.clear();
  const { view, base, cohort, breakdown } = context;
  const active = activeFilters();
  $('filterCount').textContent = active.length ? `(${active.length} active)` : '';
  $('activeFilters').innerHTML = active.map(filter => `<div class="filter-chip"><span title="${escape(filterDescription(filter))}">${escape(filterDescription(filter))}</span><button type="button" data-remove-filter="${escape(filter.id)}" aria-label="Clear this filter">×</button></div>`).join('');
  $('activeFilters').querySelectorAll('button').forEach(button => button.addEventListener('click', () => { settings().filters.find(filter => filter.id === button.dataset.removeFilter).values.clear(); renderFilters(); renderAnalysis(); }));
  const siteCount = new Set(cohort.map(entry => entry.siteId).filter(Boolean)).size;
  const granteeCount = new Set(cohort.map(entry => entry.granteeId || entry.grantee?.grantee_id).filter(Boolean)).size;
  $('analysisStatus').innerHTML = `<strong>${number(cohort.length)}</strong> of ${number(base.entries.length)} ${escape(view.grain)} in this view${active.length ? ` · ${active.length} active filter${active.length > 1 ? 's' : ''}` : ''}${breakdown ? ` · ${number(context.groups.length)} breakdown groups` : ''}${siteCount ? ` · ${number(siteCount)} sites` : ''}${granteeCount ? ` · ${number(granteeCount)} grantees` : ''}`;
  $('resultsTitle').textContent = view.label;
  $('resultsContext').textContent = breakdown ? `Breakdown: ${sourceLabel(settings().source)} → ${breakdown.label}` : 'Overall responses · Add a breakdown to compare groups';
  $('cohortNote').textContent = [base.cohortNote || view.cohortNote || '', 'Percentages use the people or records answering each question within each group. Missing breakdown values remain included.'].filter(Boolean).join(' ');
  const diag = base.diagnostics || {};
  $('dataDetails').innerHTML = `<p><strong>Workbook</strong><br>${escape(fileName)}</p><p><strong>Counting unit</strong><br>${escape(view.grain)}. Results count records at this grain; they are not deduplicated across other surveys.</p><p>Site attributes matched: ${number(diag.siteMatched || 0)} of ${number(base.entries.length)}.<br>Grantee attributes matched: ${number(diag.granteeMatched || 0)} of ${number(base.entries.length)}.</p><p>Missing/unresolved site keys: ${number(diag.siteMissing || 0)}.<br>Ambiguous site keys: ${number(diag.siteAmbiguous || 0)}.<br>Missing/unresolved grantee keys: ${number(diag.granteeMissing || 0)}.<br>Ambiguous grantee keys: ${number(diag.granteeAmbiguous || 0)}.</p>${diag.multipleSiteFamilies ? `<p>${number(diag.multipleSiteFamilies)} families have children at multiple sites. Their family-level responses remain intact; use the child-question view for child/site comparisons.</p>` : ''}<p>Metadata and quality-control fields are excluded from the question lists. The original workbook remains unchanged.</p>`;
  renderQuestionList();
}

function renderQuestionList() {
  destroyCharts(); const sequence = ++renderSequence;
  const questions = matchingQuestions();
  $('questionCount').textContent = `${questions.length} / ${context.view.questions.length}`;
  $('questionNav').innerHTML = questions.map(question => `<a href="#${cardId(question)}">${escape(question.label)}</a>`).join('');
  $('questionResults').replaceChildren();
  $('exportCsv').disabled = !questions.length || !context.cohort.length;
  if (!context.cohort.length || !questions.length) {
    $('questionResults').innerHTML = `<div class="empty-result">${!context.cohort.length ? '<strong>No responses match these filters.</strong><br>Clear or widen a filter to continue exploring. Missing and unresolved characteristics are available as filter values.' : '<strong>No questions match this search.</strong><br>Try a shorter phrase or clear the search to see every question.'}</div>`;
    return;
  }
  observer = new IntersectionObserver(entries => {
    entries.forEach(item => {
      if (!item.isIntersecting || sequence !== renderSequence) return;
      observer.unobserve(item.target);
      const question = questions.find(candidate => candidate.id === item.target.dataset.question);
      if (question) fillQuestion(item.target, question);
    });
  }, { rootMargin: '500px 0px' });
  questions.forEach(question => {
    const card = document.createElement('article'); card.className = 'question-result'; card.id = cardId(question); card.dataset.question = question.id;
    const index = context.view.questions.indexOf(question) + 1;
    card.innerHTML = `<header class="question-result-header"><span class="question-index">Question ${index}</span><h4>${escape(question.label)}</h4><p class="question-n"></p></header><div class="question-result-body"><p class="question-placeholder">Question results load as you scroll.</p></div>`;
    $('questionResults').append(card); observer.observe(card);
  });
}

function cardId(question) { return `question-${encodeURIComponent(question.id).replace(/%/g, '-')}`; }
function statsFor(question) {
  if (questionStats.has(question.id)) return questionStats.get(question.id);
  const allAnswers = new Set(question.options || []);
  const groups = context.groups.map(group => {
    const counts = new Map(); let answered = 0; const numeric = [];
    group.entries.forEach(entry => {
      if (!hasAnswer(entry, question)) return;
      const answers = labels(entry, question);
      if (question.type === 'numeric') {
        const value = Number(answers[0]);
        if (!answers.length || !Number.isFinite(value)) return;
        numeric.push(value); answered += 1;
      } else {
        answered += 1;
        answers.forEach(answer => { allAnswers.add(answer); counts.set(answer, (counts.get(answer) || 0) + 1); });
      }
    });
    numeric.sort((a, b) => a - b);
    const mean = numeric.length ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length : null;
    const middle = Math.floor(numeric.length / 2);
    const median = numeric.length ? (numeric.length % 2 ? numeric[middle] : (numeric[middle - 1] + numeric[middle]) / 2) : null;
    return { ...group, counts, answered, missing: group.entries.length - answered, mean, median, min: numeric[0] ?? null, max: numeric.at(-1) ?? null };
  });
  const answered = context.cohort.reduce((total, entry) => total + (hasAnswer(entry, question) ? 1 : 0), 0);
  const result = { groups, answers: orderLabels([...allAnswers], question), answered, missing: context.cohort.length - answered };
  questionStats.set(question.id, result); return result;
}

function footnote(question) {
  let note = question.type === 'numeric' ? 'Numeric summaries use valid numeric answers in each group.' : 'Percent = answer count ÷ answering records within this group. A dash means nobody answered; it is not 0%.';
  if (question.type === 'multi') note += ' Select-all-that-apply question: percentages can total more than 100%. An answered checkbox question with no selected options remains in the denominator.';
  if (context.breakdown?.type === 'multi') note += ' Breakdown groups overlap: one record can appear in more than one selected group. Group totals should not be added together.';
  return note;
}

function percent(count, base) { return base ? `${number(count / base * 100)}%` : '—'; }
function cell(count, base) { return `<strong>${percent(count, base)}</strong><small>n = ${number(count)}</small>`; }

function tableMarkup(question, result) {
  const name = context.breakdown?.label || 'Group';
  if (question.type === 'numeric') {
    return `<div class="result-table-wrap numeric-result"><table class="result-table"><caption class="sr-only">${escape(question.label)} — numeric summaries by ${escape(name)}</caption><thead><tr><th scope="col">${escape(name)}</th><th scope="col">Answered / missing</th>${['Mean', 'Median', 'Minimum', 'Maximum'].map(label => `<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${result.groups.map(group => `<tr><th scope="row">${escape(group.label)}</th><td class="base-cell">${number(group.answered)} / ${number(group.missing)}</td>${[group.mean, group.median, group.min, group.max].map(value => `<td>${value === null ? '—' : number(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  if (!result.answers.length) return '<div class="empty-result">No answer options were selected in this cohort. Answered and missing counts are shown above.</div>';
  if (!context.breakdown) {
    const group = result.groups[0];
    return `<div class="result-table-wrap"><table class="result-table"><caption class="sr-only">${escape(question.label)} — overall response distribution</caption><thead><tr><th scope="col">Response</th><th scope="col">Count</th><th scope="col">Percent of answering records</th></tr></thead><tbody>${result.answers.map(answer => `<tr><th scope="row">${escape(answer)}</th><td>${number(group.counts.get(answer) || 0)}</td><td><strong>${percent(group.counts.get(answer) || 0, group.answered)}</strong></td></tr>`).join('')}</tbody></table></div>`;
  }
  return `<div class="result-table-wrap"><table class="result-table"><caption class="sr-only">${escape(question.label)} — response distribution by ${escape(name)}</caption><thead><tr><th scope="col">${escape(name)}</th><th scope="col">Answered / missing</th>${result.answers.map(answer => `<th scope="col">${escape(answer)}</th>`).join('')}</tr></thead><tbody>${result.groups.map(group => `<tr><th scope="row">${escape(group.label)}</th><td class="base-cell">${number(group.answered)} / ${number(group.missing)}</td>${result.answers.map(answer => `<td>${cell(group.counts.get(answer) || 0, group.answered)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function fillQuestion(card, question) {
  const result = statsFor(question);
  card.querySelector('.question-n').innerHTML = `<span><strong>${number(result.answered)}</strong> answered</span><span>${number(result.missing)} missing</span><span>${escape(context.view.grain)}</span>`;
  const body = card.querySelector('.question-result-body');
  body.innerHTML = `${mode === 'chart' && question.type !== 'numeric' && result.answers.length ? '<div class="chart-wrap"><canvas role="img"></canvas></div><div class="chart-actions"></div><details class="chart-table"><summary>View counts and percentages</summary>' : ''}${tableMarkup(question, result)}${mode === 'chart' && question.type !== 'numeric' && result.answers.length ? '</details>' : ''}<p class="result-footnote">${escape(footnote(question))}</p>`;
  if (mode === 'chart' && question.type !== 'numeric' && result.answers.length) drawChart(card, question, result);
}

function wrapLabel(label, width = 58) {
  const words = String(label).split(/\s+/); const lines = []; let line = '';
  words.forEach(word => { if (line.length + word.length > width && line) { lines.push(line); line = ''; } line += `${line ? ' ' : ''}${word}`; });
  if (line) lines.push(line); return lines;
}

function drawChart(card, question, result, page = 0) {
  if (!window.Chart) { card.querySelector('.chart-wrap').innerHTML = '<p class="empty-result">Charts could not load. Counts and percentages remain available below.</p>'; return; }
  const isBreakdown = Boolean(context.breakdown);
  const pageSize = 20;
  const groups = isBreakdown ? result.groups.slice(page * pageSize, (page + 1) * pageSize) : result.groups;
  const canvas = card.querySelector('canvas');
  const old = charts.get(question.id); if (old) old.destroy();
  card.querySelector('.chart-wrap').style.height = `${Math.max(260, (isBreakdown ? groups.length : result.answers.length) * 32 + 155)}px`;
  canvas.setAttribute('aria-label', `${question.label}${isBreakdown ? ` by ${context.breakdown.label}` : ''}. Percentages and counts are available in the following table.`);
  const dataset = isBreakdown ? result.answers.map((answer, index) => ({ label: answer, backgroundColor: COLORS[index % COLORS.length], data: groups.map(group => group.answered ? (group.counts.get(answer) || 0) / group.answered * 100 : null) })) : [{ label: '% of answering records', backgroundColor: '#087f73', data: result.answers.map(answer => groups[0].answered ? (groups[0].counts.get(answer) || 0) / groups[0].answered * 100 : null) }];
  const chart = new Chart(canvas, {
    type: 'bar',
    data: { labels: (isBreakdown ? groups.map(group => group.label) : result.answers).map(label => wrapLabel(label, 35)), datasets: dataset },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: 'y', animation: false,
      plugins: {
        title: { display: true, text: [...wrapLabel(question.label, 85), ...(isBreakdown ? wrapLabel(`By ${context.breakdown.label}`, 85) : [])], align: 'start', color: '#294e59', font: { size: 12, weight: '600' }, padding: { bottom: 18 } },
        legend: { display: isBreakdown, position: 'bottom', title: { display: isBreakdown, text: 'Answer to the question above' }, labels: { boxWidth: 12, font: { size: 10 } } },
        tooltip: { callbacks: { label: item => { const group = isBreakdown ? groups[item.dataIndex] : groups[0]; const answer = isBreakdown ? item.dataset.label : result.answers[item.dataIndex]; return `${answer}: ${percent(group.counts.get(answer) || 0, group.answered)} (n=${number(group.counts.get(answer) || 0)}; answered N=${number(group.answered)})`; } } }
      },
      scales: { x: { beginAtZero: true, stacked: isBreakdown, ...(question.type !== 'multi' ? { max: 100 } : {}), title: { display: true, text: '% of answering records within each group' }, ticks: { callback: value => `${value}%` }, grid: { color: '#edf2f3' } }, y: { stacked: isBreakdown, grid: { display: false }, ticks: { font: { size: 10 } } } }
    }
  });
  charts.set(question.id, chart);
  const actions = card.querySelector('.chart-actions');
  actions.innerHTML = `<span>${isBreakdown && result.groups.length > pageSize ? `Groups ${page * pageSize + 1}–${Math.min((page + 1) * pageSize, result.groups.length)} of ${number(result.groups.length)} · Table includes all groups` : ''}</span><div>${isBreakdown && result.groups.length > pageSize ? '<button class="ghost-btn previous-groups" type="button">← Previous</button><button class="ghost-btn next-groups" type="button">Next →</button>' : ''}<button class="text-btn download-chart" type="button">Download chart</button></div>`;
  if (actions.querySelector('.previous-groups')) {
    actions.querySelector('.previous-groups').disabled = page === 0;
    actions.querySelector('.next-groups').disabled = (page + 1) * pageSize >= result.groups.length;
    actions.querySelector('.previous-groups').addEventListener('click', () => drawChart(card, question, result, page - 1));
    actions.querySelector('.next-groups').addEventListener('click', () => drawChart(card, question, result, page + 1));
  }
  actions.querySelector('.download-chart').addEventListener('click', () => downloadChart(canvas, question, page));
}

function downloadChart(canvas, question, page) {
  const notes = [context.view.label, `Unit: ${context.view.grain}. ${footnote(question)}`, activeFilters().length ? `Filters: ${activeFilters().map(filterDescription).join('; ')}` : 'Filters: none', `Source: ${fileName}${context.groups.length > 20 ? `. Chart group page ${page + 1}.` : ''}`];
  const lines = notes.flatMap(note => wrapLabel(note, Math.max(40, Math.floor(canvas.width / 7))));
  const output = document.createElement('canvas'); output.width = canvas.width; output.height = canvas.height + lines.length * 15 + 28;
  const ctx = output.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, output.width, output.height); ctx.drawImage(canvas, 0, 0);
  ctx.fillStyle = '#536b73'; ctx.font = '12px sans-serif';
  let y = canvas.height + 18;
  lines.forEach(line => { ctx.fillText(line, 10, y); y += 15; });
  output.toBlob(blob => { if (blob) downloadBlob(blob, `${currentView} - ${question.id}.png`); });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename.replace(/[\\/:*?"<>|]/g, '-'); anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportCsv() {
  const button = $('exportCsv'); button.disabled = true; button.textContent = 'Preparing CSV…';
  try {
    await new Promise(resolve => setTimeout(resolve, 30));
    const rows = [['Survey', 'Question', 'Breakdown source', 'Breakdown characteristic', 'Group', 'Answer / statistic', 'Count / value', 'Answered N', 'Missing N', 'Group records', 'Percent of answering records', 'Counting unit', 'Filters', 'Workbook']];
    const filterText = activeFilters().map(filterDescription).join('; ') || 'None';
    for (const question of matchingQuestions()) {
      const result = statsFor(question);
      result.groups.forEach(group => {
        const prefix = [context.view.label, question.label, sourceLabel(settings().source), context.breakdown?.label || '', group.label];
        const suffix = [context.view.grain, filterText, fileName];
        if (question.type === 'numeric') {
          [['Mean', group.mean], ['Median', group.median], ['Minimum', group.min], ['Maximum', group.max]].forEach(([statistic, value]) => rows.push([...prefix, statistic, value ?? '', group.answered, group.missing, group.entries.length, '', ...suffix]));
        } else result.answers.forEach(answer => { const count = group.counts.get(answer) || 0; rows.push([...prefix, answer, count, group.answered, group.missing, group.entries.length, group.answered ? Math.round(count / group.answered * 1000) / 10 : '', ...suffix]); });
      });
    }
    const csvCell = value => { const safe = typeof value === 'string' && /^[=+\-@]/.test(value) ? `'${value}` : String(value ?? ''); return `"${safe.replace(/"/g, '""')}"`; };
    downloadBlob(new Blob(['\uFEFF', rows.map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }), `${context.view.label} - exploration.csv`);
  } finally { button.disabled = false; button.textContent = 'Download CSV'; }
}

$('fileInput').addEventListener('change', event => loadWorkbook(event.target.files[0]));
['dragenter', 'dragover'].forEach(name => $('fileDrop').addEventListener(name, event => { event.preventDefault(); $('fileDrop').classList.add('is-dragover'); }));
['dragleave', 'drop'].forEach(name => $('fileDrop').addEventListener(name, event => { event.preventDefault(); $('fileDrop').classList.remove('is-dragover'); }));
$('fileDrop').addEventListener('drop', event => loadWorkbook(event.dataTransfer.files[0]));
$('replaceWorkbook').addEventListener('click', () => { $('uploadPanel').classList.remove('hidden'); window.scrollTo({ top: 0, behavior: 'smooth' }); });
$('surveySelect').addEventListener('change', event => { currentView = event.target.value; syncControls(); renderAnalysis(); });
$('breakdownSource').addEventListener('change', event => { settings().source = event.target.value; settings().field = ''; syncControls(); renderAnalysis(); });
$('breakdownField').addEventListener('change', event => { settings().field = event.target.value; renderAnalysis(); });
$('addFilter').addEventListener('click', () => { settings().filters.push({ id: String(++filterSequence), source: 'survey', field: '', values: new Set() }); renderFilters(); });
$('questionSearch').addEventListener('input', event => { settings().search = event.target.value; renderQuestionList(); });
$('exportCsv').addEventListener('click', exportCsv);
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
  mode = button.dataset.view;
  document.querySelectorAll('[data-view]').forEach(item => { item.classList.toggle('is-active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
  renderQuestionList();
}));
