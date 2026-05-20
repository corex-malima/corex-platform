import { describe as describeTest, expect, it } from "vitest";

import { describe, mean, median, minMax, quartiles, sampleSd } from "../statistics";

describeTest("mean", () => {
  it("returns null for empty array", () => {
    expect(mean([])).toBe(null);
  });

  it("returns the value for single element", () => {
    expect(mean([42])).toBe(42);
  });

  it("calculates arithmetic mean", () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3);
    expect(mean([10, 20, 30])).toBe(20);
  });

  it("filters out null, undefined, NaN, Infinity", () => {
    expect(mean([1, null, 2, undefined, 3, NaN, Infinity, -Infinity])).toBe(2);
  });
});

describeTest("median", () => {
  it("returns null for empty array", () => {
    expect(median([])).toBe(null);
  });

  it("handles single element", () => {
    expect(median([7])).toBe(7);
  });

  it("returns middle value for odd-length", () => {
    expect(median([1, 2, 3])).toBe(2);
    expect(median([5, 1, 3])).toBe(3); // unsorted input works
  });

  it("averages two middle values for even-length", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([10, 20])).toBe(15);
  });
});

describeTest("sampleSd", () => {
  it("returns null for fewer than 2 values", () => {
    expect(sampleSd([])).toBe(null);
    expect(sampleSd([5])).toBe(null);
  });

  it("calculates sample standard deviation (n-1 denominator)", () => {
    // Caso clásico: [2,4,4,4,5,5,7,9] → sd ≈ 2.138
    const sd = sampleSd([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(sd).not.toBeNull();
    expect(sd!).toBeCloseTo(2.138, 2);
  });

  it("returns 0 when all values are identical", () => {
    expect(sampleSd([5, 5, 5, 5])).toBe(0);
  });
});

describeTest("quartiles", () => {
  it("returns nulls for empty array", () => {
    expect(quartiles([])).toEqual({ q1: null, q2: null, q3: null });
  });

  it("calculates q1, q2, q3 for [1,2,3,4,5]", () => {
    const q = quartiles([1, 2, 3, 4, 5]);
    expect(q.q1).toBe(2);
    expect(q.q2).toBe(3);
    expect(q.q3).toBe(4);
  });

  it("calculates linear interpolation for [1,2,3,4]", () => {
    // method='linear': q(0.25) at index 0.75 → 1 + 0.75*(2-1) = 1.75
    const q = quartiles([1, 2, 3, 4]);
    expect(q.q1).toBeCloseTo(1.75, 5);
    expect(q.q2).toBeCloseTo(2.5, 5);
    expect(q.q3).toBeCloseTo(3.25, 5);
  });
});

describeTest("minMax", () => {
  it("returns nulls for empty array", () => {
    expect(minMax([])).toEqual({ min: null, max: null });
  });

  it("finds min and max in unsorted array", () => {
    expect(minMax([5, 1, 3, 9, 2])).toEqual({ min: 1, max: 9 });
  });

  it("filters non-finite values", () => {
    expect(minMax([1, NaN, null, 5, Infinity, 3])).toEqual({ min: 1, max: 5 });
  });
});

describeTest("describe (consolidated)", () => {
  it("returns all nulls for empty array", () => {
    const d = describe([]);
    expect(d).toEqual({ n: 0, mean: null, median: null, sd: null, q1: null, q3: null, p10: null, p90: null, min: null, max: null });
  });

  it("returns valid stats for typical input", () => {
    const d = describe([1, 2, 3, 4, 5]);
    expect(d.n).toBe(5);
    expect(d.mean).toBe(3);
    expect(d.median).toBe(3);
    expect(d.sd).toBeCloseTo(1.5811, 3); // sd of 1..5 = sqrt(10/4) ≈ 1.5811
    expect(d.q1).toBe(2);
    expect(d.q3).toBe(4);
    // P10/P90 via linear interpolation: [1,2,3,4,5], p=0.10 → idx=0.4 → 1*0.6+2*0.4=1.4
    expect(d.p10).toBeCloseTo(1.4, 5);
    expect(d.p90).toBeCloseTo(4.6, 5);
    expect(d.min).toBe(1);
    expect(d.max).toBe(5);
  });

  it("returns sd=null for single element", () => {
    const d = describe([42]);
    expect(d.n).toBe(1);
    expect(d.mean).toBe(42);
    expect(d.median).toBe(42);
    expect(d.sd).toBe(null);
    expect(d.min).toBe(42);
    expect(d.max).toBe(42);
  });

  it("is consistent with individual helpers", () => {
    const values = [10, 20, 30, 40, 50, 60, 70, 80];
    const d = describe(values);
    expect(d.mean).toBe(mean(values));
    expect(d.median).toBe(median(values));
    expect(d.sd).toBe(sampleSd(values));
    expect(d.q1).toBe(quartiles(values).q1);
    expect(d.q3).toBe(quartiles(values).q3);
  });

  it("filters non-finite consistently", () => {
    const d = describe([1, null, 2, undefined, 3, NaN, Infinity]);
    expect(d.n).toBe(3);
    expect(d.mean).toBe(2);
    expect(d.median).toBe(2);
  });
});
