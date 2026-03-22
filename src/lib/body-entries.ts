import { parseJson, stringifyJson } from './database';
import { BodyMeasurement } from './types';

type BodyMetrics = {
  chest?: number;
  waist?: number;
  hips?: number;
  upperArm?: number;
  forearm?: number;
  thigh?: number;
  calf?: number;
};

export function toBodyMetrics(input: {
  chest?: number;
  waist?: number;
  hips?: number;
  upperArm?: number;
  forearm?: number;
  thigh?: number;
  calf?: number;
}) {
  const metrics: BodyMetrics = {};
  if (input.chest !== undefined && input.chest !== null) metrics.chest = input.chest;
  if (input.waist !== undefined && input.waist !== null) metrics.waist = input.waist;
  if (input.hips !== undefined && input.hips !== null) metrics.hips = input.hips;
  if (input.upperArm !== undefined && input.upperArm !== null) metrics.upperArm = input.upperArm;
  if (input.forearm !== undefined && input.forearm !== null) metrics.forearm = input.forearm;
  if (input.thigh !== undefined && input.thigh !== null) metrics.thigh = input.thigh;
  if (input.calf !== undefined && input.calf !== null) metrics.calf = input.calf;
  return metrics;
}

export function toBodyMetricsJson(input: {
  chest?: number;
  waist?: number;
  hips?: number;
  upperArm?: number;
  forearm?: number;
  thigh?: number;
  calf?: number;
}) {
  return stringifyJson(toBodyMetrics(input)) ?? '{}';
}

export function fromBodyEntryRow(row: any): BodyMeasurement {
  const metrics = parseJson<BodyMetrics>(row.metrics) ?? {};
  return {
    id: row.id,
    userId: row.user_id,
    date: new Date(row.measured_at),
    weight: row.weight_kg !== null && row.weight_kg !== undefined ? Number(row.weight_kg) : undefined,
    chest: metrics.chest,
    waist: metrics.waist,
    hips: metrics.hips,
    upperArm: metrics.upperArm,
    forearm: metrics.forearm,
    thigh: metrics.thigh,
    calf: metrics.calf,
  };
}
