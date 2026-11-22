import { describe, expect, it } from 'vitest'
import type { GradeColumn, GradeGroup, GroupPerformance, StudentGroupGrades, StudentPerformance } from '@shigjetademy/shared/grades'
import {
  getAverageBands,
  getBarHeightPercent,
  getBarWidthPercent,
  getEdgeAlign,
  getGradePoints,
  getLinePlot,
  getTrendTooltipPlacement,
  getOverviewStats,
  getTermAverage,
  isBelowPassMark,
  sortGroupsByAverage,
} from './report-charts'
import type { GradePoint } from './report-charts'

const group = (name: string): GradeGroup => ({ id: `g-${name}`, name, course_name: 'Mathematics', is_archived: false })

const performance = (name: string, average: { points: number; max_points: number; percent: number } | null, missing = 0): GroupPerformance => ({
  group: group(name),
  student_count: 2,
  average,
  marked_count: average ? 1 : 0,
  missing_count: missing,
})

describe('getOverviewStats', () => {
  it('averages all groups’ marked work together and sums their missing assignments', () => {
    const stats = getOverviewStats({
      groups: [performance('A', { points: 45, max_points: 60, percent: 75 }, 1), performance('B', { points: 5, max_points: 40, percent: 13 }, 2), performance('C', null, 3)],
      below_pass_count: 4,
    })

    // 50 of 100 points
    expect(stats).toEqual({ average: { points: 50, max_points: 100, percent: 50 }, groupCount: 3, belowPassCount: 4, missingCount: 6 })
  })

  it('has no average before anything is marked', () => {
    expect(getOverviewStats({ groups: [performance('A', null)], below_pass_count: 0 }).average).toBeNull()
  })
})

describe('sortGroupsByAverage', () => {
  it('puts the highest average first and groups without marks last, by name', () => {
    const sorted = sortGroupsByAverage([
      performance('Delta', null),
      performance('Alpha', { points: 1, max_points: 2, percent: 50 }),
      performance('Charlie', null),
      performance('Bravo', { points: 9, max_points: 10, percent: 90 }),
    ])

    expect(sorted.map((item) => item.group.name)).toEqual(['Bravo', 'Alpha', 'Charlie', 'Delta'])
  })
})

const student = (percent: number | null): StudentPerformance => ({
  student: { id: `s-${String(percent)}`, first_name: 'A', last_name: 'B' },
  average: percent === null ? null : { points: percent, max_points: 100, percent },
  marked_count: 1,
  missing_count: 0,
})

describe('getAverageBands', () => {
  it('counts students into 0–49, 50–69, 70–84 and 85–100 on the band edges, and leaves out those without marks', () => {
    const bands = getAverageBands([student(0), student(49), student(50), student(69), student(70), student(84), student(85), student(100), student(null)])

    expect(bands.map(({ key, label, count, isBelowPassMark }) => [key, label, count, isBelowPassMark])).toEqual([
      ['FAILING', '0–49%', 2, true],
      ['PASSING', '50–69%', 2, false],
      ['GOOD', '70–84%', 2, false],
      ['EXCELLENT', '85–100%', 2, false],
    ])
  })
})

describe('getBarHeightPercent', () => {
  it('scales a count against the tallest, and is 0 when nothing is counted', () => {
    expect(getBarHeightPercent({ count: 2, max: 8 })).toBe(25)
    expect(getBarHeightPercent({ count: 0, max: 0 })).toBe(0)
  })
})

const column = (id: string, date: string, maxPoints: number): GradeColumn => ({ kind: 'ASSIGNMENT', id, title: `Work ${id}`, date, max_points: maxPoints })

const ALGEBRA: StudentGroupGrades = {
  group: group('A'),
  grades: [
    { column: column('a-2', '2026-10-10T10:00:00.000Z', 20), cell: { column_id: 'a-2', status: 'MARKED', points: 15, feedback: null } },
    { column: column('a-3', '2026-10-12T10:00:00.000Z', 20), cell: { column_id: 'a-3', status: 'MISSING', points: null, feedback: null } },
  ],
  average: { points: 15, max_points: 20, percent: 75 },
}

const PHYSICS: StudentGroupGrades = {
  group: group('B'),
  grades: [
    { column: column('b-1', '2026-10-01T10:00:00.000Z', 10), cell: { column_id: 'b-1', status: 'MARKED', points: 3, feedback: null } },
    { column: { ...column('b-2', '2026-10-20T10:00:00.000Z', 40), kind: 'TEST' }, cell: { column_id: 'b-2', status: 'ABSENT', points: null, feedback: 'Ill.' } },
  ],
  average: { points: 3, max_points: 10, percent: 30 },
}

describe('getTermAverage', () => {
  it('is points over max points of marked work across every group', () => {
    // 18 of 30
    expect(getTermAverage([ALGEBRA, PHYSICS])).toEqual({ points: 18, max_points: 30, percent: 60 })
    expect(getTermAverage([{ ...ALGEBRA, grades: [], average: null }])).toBeNull()
  })
})

describe('getGradePoints', () => {
  it('keeps marked work only, by date, with its percent', () => {
    expect(getGradePoints([ALGEBRA, PHYSICS])).toEqual([
      { id: 'b-1', title: 'Work b-1', groupName: 'B', date: '2026-10-01T10:00:00.000Z', points: 3, maxPoints: 10, percent: 30 },
      { id: 'a-2', title: 'Work a-2', groupName: 'A', date: '2026-10-10T10:00:00.000Z', points: 15, maxPoints: 20, percent: 75 },
    ])
  })
})

describe('getLinePlot', () => {
  it('places points by time across 0–100 and by percent from the top, with a path through them', () => {
    const plot = getLinePlot([
      { id: '1', title: 'One', groupName: 'A', date: '2026-10-01T00:00:00.000Z', points: 3, maxPoints: 10, percent: 30 },
      { id: '2', title: 'Two', groupName: 'A', date: '2026-10-03T00:00:00.000Z', points: 1, maxPoints: 1, percent: 100 },
      { id: '3', title: 'Three', groupName: 'A', date: '2026-10-11T00:00:00.000Z', points: 1, maxPoints: 2, percent: 50 },
    ])

    expect(plot.points.map(({ x, y }) => [x, y])).toEqual([
      [0, 70],
      [20, 0],
      [100, 50],
    ])
    expect(plot.path).toBe('M 0 70 L 20 0 L 100 50')
  })

  it('centres a single point, and gives it the whole plot to hover', () => {
    const one = { id: '1', title: 'One', groupName: 'A', date: '2026-10-01T00:00:00.000Z', points: 3, maxPoints: 4, percent: 75 }
    expect(getLinePlot([one]).points.map(({ x, y, hitStart, hitEnd }) => [x, y, hitStart, hitEnd])).toEqual([[50, 25, 0, 100]])
  })

  it('splits the hover strips halfway between dates', () => {
    const plot = getLinePlot([point('1', '2026-10-01'), point('2', '2026-10-03'), point('3', '2026-10-11')])

    expect(plot.points.map(({ hitStart, hitEnd }) => [hitStart, hitEnd])).toEqual([
      [0, 10],
      [10, 60],
      [60, 100],
    ])
  })

  it('nudges marks on the same date apart and gives each an equal share of that date’s strip, inside the plot', () => {
    const plot = getLinePlot([point('1', '2026-10-01'), point('2', '2026-10-01'), point('3', '2026-10-01'), point('4', '2026-10-11')])

    // The first date's strip runs 0–50; its three marks sit 2 apart from the left edge
    expect(plot.points.map(({ x, hitStart, hitEnd }) => [x, round(hitStart), round(hitEnd)])).toEqual([
      [0, 0, 16.67],
      [2, 16.67, 33.33],
      [4, 33.33, 50],
      [100, 50, 100],
    ])
  })
})

const round = (value: number) => Math.round(value * 100) / 100

const point = (id: string, day: string): GradePoint => ({ id, title: id, groupName: 'A', date: `${day}T00:00:00.000Z`, points: 1, maxPoints: 2, percent: 50 })

describe('getTrendTooltipPlacement', () => {
  it('opens towards the wider side, no wider than the room left', () => {
    expect(getTrendTooltipPlacement(20)).toEqual({ side: 'after', roomPercent: 80 })
    expect(getTrendTooltipPlacement(70)).toEqual({ side: 'before', roomPercent: 70 })
  })
})

describe('getEdgeAlign', () => {
  it('lines the first and last up with the chart’s edges and centres the rest', () => {
    expect([0, 1, 2, 3].map((index) => getEdgeAlign({ index, count: 4 }))).toEqual(['start', 'center', 'center', 'end'])
  })
})

describe('getBarWidthPercent', () => {
  it('keeps a 0% average a sliver wide, so it can be seen and focused', () => {
    expect(getBarWidthPercent(0)).toBe(1)
    expect(getBarWidthPercent(75)).toBe(75)
  })
})

describe('isBelowPassMark', () => {
  it('is under 50%, and not before anything is marked', () => {
    expect(isBelowPassMark({ points: 49, max_points: 100, percent: 49 })).toBe(true)
    expect(isBelowPassMark({ points: 50, max_points: 100, percent: 50 })).toBe(false)
    expect(isBelowPassMark(null)).toBe(false)
  })
})
