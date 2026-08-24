'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { generatePlan, generatePortfolioPlan, parseIcs } = require('../planner-core.js');

function baseInput(overrides = {}) {
  return {
    title: '基本情報の学習',
    goal: '全範囲を終えて問題を解けるようにする',
    current: 0,
    target: 30,
    unit: 'pages',
    pacePerHour: 10,
    startDate: '2026-08-24',
    deadline: '2026-08-28',
    weekdays: [1, 3, 5],
    availableFrom: '19:00',
    availableUntil: '21:00',
    sessionMinutes: 60,
    reviewEnabled: false,
    busyEvents: [],
    now: new Date(2026, 7, 24, 9, 0),
    ...overrides
  };
}

test('選択した曜日だけに必要量を配分する', () => {
  const plan = generatePlan(baseInput());
  assert.equal(plan.feasible, true);
  assert.equal(plan.sessions.length, 3);
  assert.deepEqual(plan.sessions.map(session => new Date(session.start).getDay()), [1, 3, 5]);
  assert.deepEqual(plan.sessions.map(session => session.amount), [10, 10, 10]);
  assert.equal(plan.predictedCompletion, '2026-08-28');
});

test('既存予定と重なる場合は同じ時間帯の空きへずらす', () => {
  const plan = generatePlan(baseInput({
    target: 10,
    deadline: '2026-08-24',
    weekdays: [1],
    busyEvents: [{
      start: new Date(2026, 7, 24, 19, 0).toISOString(),
      end: new Date(2026, 7, 24, 20, 0).toISOString(),
      summary: '会議'
    }]
  }));
  assert.equal(new Date(plan.sessions[0].start).getHours(), 20);
  assert.equal(new Date(plan.sessions[0].end).getHours(), 21);
});

test('期限内の時間が足りない場合は不足分を返す', () => {
  const plan = generatePlan(baseInput({
    target: 120,
    unit: 'minutes',
    pacePerHour: 0,
    deadline: '2026-08-24',
    weekdays: [1]
  }));
  assert.equal(plan.feasible, false);
  assert.equal(plan.shortageMinutes, 60);
  assert.equal(plan.sessions.length, 1);
  assert.equal(plan.sessions[0].amount, 60);
});

test('Googleカレンダー形式のics予定を読み込める', () => {
  const ics = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'DTSTART:20260825T190000',
    'DTEND:20260825T200000',
    'SUMMARY:英会話\\, オンライン',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  const result = parseIcs(ics);
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].start.getHours(), 19);
  assert.equal(result.events[0].summary, '英会話, オンライン');
});

test('成果指標と複数教材の進捗を分離して計画する', () => {
  const plan = generatePortfolioPlan({
    ...baseInput({ target: undefined, current: undefined, unit: undefined, pacePerHour: undefined }),
    goalType: 'outcome',
    metricName: 'TOEICスコア',
    metricCurrent: 650,
    metricTarget: 800,
    metricUnit: '点',
    assessmentEvery: 4,
    deadline: '2026-09-04',
    workloads: [
      { id: 'vocab', name: '単語帳', genre: 'TOEIC', materialType: '単語帳', current: 400, total: 1000, unit: '語', pacePerHour: 60, skills: ['語彙'] },
      { id: 'grammar', name: '文法問題集', genre: 'TOEIC', materialType: '問題集', current: 100, total: 500, unit: '問', pacePerHour: 30, skills: ['Part 5'] }
    ]
  });
  assert.equal(plan.goalType, 'outcome');
  assert.equal(plan.feasible, null);
  assert.ok(plan.sessions.some(session => session.type === 'assessment'));
  assert.deepEqual(new Set(plan.sessions.filter(session => session.type === 'study').map(session => session.materialId)), new Set(['vocab', 'grammar']));
  assert.match(plan.coachMessage, /650点から800点/);
});
