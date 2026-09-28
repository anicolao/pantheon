import { createHash } from 'node:crypto';
import { cards } from '../../src/lib/game/cards';
import { leaderIds } from '../../src/lib/game/setup';
import { lineups, type PlayerCount } from './runner';
import { candidates, families, type Family, type Profile, type Restriction } from './strategy';
import { runExperiment, type StudyResult } from './experiment';

export const studyVersion = 1;
export type Profiles = { version: number; trainingSeeds: string[]; selected: Record<string, Profile>; restriction?: Restriction; training: { key: string; candidate: number; share: number; games: number }[] };
export type StudyConfig = { stage: 'discovery' | 'confirmation'; seed: string; blocks: number; counts: PlayerCount[]; families: Family[]; restrictions: Restriction[] };
export const profileKey = (count: number, leader: string, family: Family) => `${count}/${leader}/${family}`;
export function validateConfig(value: unknown): StudyConfig {
  const config = value as StudyConfig;
  if (!config || !['discovery', 'confirmation'].includes(config.stage) || typeof config.seed !== 'string' || !/^[a-zA-Z0-9_-]{1,32}$/.test(config.seed) || !Number.isSafeInteger(config.blocks) || config.blocks < 1 || config.stage === 'confirmation' && config.blocks < 200) throw new Error('Invalid study stage, seed, or block count (confirmation requires >=200).');
  if (!Array.isArray(config.counts) || !config.counts.length || config.counts.some(count => ![2, 3, 4].includes(count)) || new Set(config.counts).size !== config.counts.length) throw new Error('Invalid player counts.');
  if (!Array.isArray(config.families) || config.families.length < 2 || config.families.some(family => !families.includes(family)) || new Set(config.families).size !== config.families.length) throw new Error('Choose at least two distinct policy families.');
  if (!Array.isArray(config.restrictions) || !config.restrictions.length) throw new Error('Declare at least one restriction.');
  for (const item of config.restrictions) {
    if (!item || !['focal', 'table'].includes(item.scope) || !['card', 'event', 'leader-trigger'].includes(item.kind)) throw new Error('Invalid restriction.');
    const def = cards.find(card => card.id === item.id);
    if (!def || item.kind === 'card' && (def.type !== 'Action' || def.uniqueStartingCard) || item.kind === 'event' && def.type !== 'Event' || item.kind === 'leader-trigger' && def.type !== 'Leader') throw new Error('Restrictions must target supply Actions, events, or leader triggers.');
  }
  if (new Set(config.restrictions.map(item => `${item.kind}:${item.id}:${item.scope}`)).size !== config.restrictions.length) throw new Error('Duplicate restriction.');
  return config;
}
export function digest(value: unknown): string { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
export function studySeeds(config: StudyConfig): string[] { return Array.from({ length: config.blocks }, (_, block) => `${config.seed}:${config.stage}:${block}`); }
export function checkIndependentSeeds(seeds: string[], previous: string[]) {
  const used = new Set(previous);
  if (seeds.some(seed => used.has(seed))) throw new Error('Training, discovery and confirmation seeds must be disjoint.');
}
export function getProfile(profiles: Profiles, count: PlayerCount, leader: string, family: Family): Profile {
  const profile = profiles.selected[profileKey(count, leader, family)];
  if (!profile || profile.family !== family || !candidates.some(candidate => JSON.stringify(candidate) === JSON.stringify(profile.parameters))) throw new Error(`Missing or invalid frozen profile: ${count}/${leader}/${family}`);
  return profile;
}
export function* schedule(config: StudyConfig, profiles: Profiles) {
  for (const count of config.counts) for (const lineup of lineups(count)) for (const focalFamily of config.families) for (const opponentFamily of config.families) for (let focal = 0; focal < count; focal++) {
    yield { count, lineup, focal, focalFamily, opponentFamily, profiles: lineup.map((leader, position) => getProfile(profiles, count, leader, position === focal ? focalFamily : opponentFamily)) };
  }
}
export function eligibleRestriction(restriction: Restriction, lineup: string[], focal: number): boolean {
  if (restriction.kind === 'leader-trigger') return restriction.scope === 'table' ? lineup.includes(restriction.id) : lineup[focal] === restriction.id;
  if (restriction.kind === 'event') return lineup.some(leader => cards.find(card => card.id === leader)!.god === cards.find(card => card.id === restriction.id)!.god);
  return true;
}
export function trainProfiles(blocks: number, seed: string, counts: PlayerCount[], onProgress: (message: string) => void = () => {}, restriction?: Restriction): Profiles {
  if (!Number.isSafeInteger(blocks) || blocks < 1 || !/^[a-zA-Z0-9_-]{1,32}$/.test(seed)) throw new Error('Invalid training budget or seed.');
  const trainingSeeds = Array.from({ length: blocks }, (_, block) => `${seed}:training:${block}`);
  const selected: Profiles['selected'] = {}, training: Profiles['training'] = [];
  for (const count of counts) for (const leader of leaderIds) for (const family of families) {
    const key = profileKey(count, leader, family);
    if (family === 'treasure') { selected[key] = { family, parameters: candidates[0] }; continue; }
    const scores: number[] = [];
    for (const [candidate, parameters] of candidates.entries()) {
      let sum = 0, games = 0;
      for (const [block, gameSeed] of trainingSeeds.entries()) for (const lineup of lineups(count).filter(lineup => lineup.includes(leader))) for (const opponent of ['treasure', 'engine'] as const) {
        const focal = lineup.indexOf(leader), profiles = lineup.map((_, position) => position === focal ? { family, parameters } : { family: opponent, parameters: candidates[0] });
        const { result } = runExperiment({ seed: gameSeed, block, lineup, profiles, focal, restriction });
        if (result.status !== 'completed') throw new Error(`Training failed: ${key}, ${gameSeed}, ${result.status}, ${result.error ?? ''}`);
        sum += result.players.find(player => player.position === focal)!.share!; games++;
      }
      scores.push(sum / games); training.push({ key, candidate, share: sum / games, games });
    }
    const best = scores.indexOf(Math.max(...scores)); selected[key] = { family, parameters: candidates[best] };
    onProgress(`Trained ${key}: preset ${best}, ${(scores[best] * 100).toFixed(1)}% training share`);
  }
  return { version: studyVersion, trainingSeeds, selected, training, ...(restriction ? { restriction } : {}) };
}
export function leagueReport(results: StudyResult[]): string {
  const groups = new Map<string, { share: number; games: number; turns: number; worship: number; favored: number; offGod: number }>();
  const failures = results.filter(row => row.status !== 'completed').length;
  for (const result of results.filter(row => row.status === 'completed')) {
    const player = result.players.find(row => row.position === result.focal)!, opponent = result.profiles.find((_, position) => position !== result.focal)!.family;
    const key = `${result.count} | ${player.leader} | ${player.family} | ${opponent}`;
    const group = groups.get(key) ?? { share: 0, games: 0, turns: 0, worship: 0, favored: 0, offGod: 0 };
    group.games++; group.share += player.share!; group.turns += player.turns;
    for (const item of Object.values(player.telemetry.worship)) { group.worship += item.standard + item.favored; group.favored += item.favored; group.offGod += item.offGod; }
    groups.set(key, group);
  }
  const lines = ['# Mixed-policy baseline league', '', `${results.length} scheduled baseline games; ${failures} failures. Each row follows the focal player against a homogeneous opponent family, with all leader lineups and focal seats equally scheduled. Self-matchups repeat once per focal seat so every focal contrast has equal weight. This is a descriptive diagnostic; no uncorrected significance claims.`, '',
    '| Players | Leader | Focal policy | Opponents | Completed games | Victory share | Mean turns | Worship / game | Favored uses | Off-god uses |', '| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |'];
  for (const [key, row] of groups) lines.push(`| ${key} | ${row.games} | ${(100 * row.share / row.games).toFixed(1)}% | ${(row.turns / row.games).toFixed(1)} | ${(row.worship / row.games).toFixed(2)} | ${row.favored} | ${row.offGod} |`);
  return lines.join('\n') + '\n';
}

export type DiscoveryManifest = { profilesHash: string; seeds: string[]; config: { stage: string }; sourceCommit: string; dirty: boolean; status: string; failures: number };
export function validateConfirmation(discovery: DiscoveryManifest, source: { sourceCommit: string; dirty: boolean }, profilesHash: string, seeds: string[]) {
  if (discovery.config.stage !== 'discovery' || discovery.status !== 'completed' || discovery.failures !== 0 || discovery.profilesHash !== profilesHash || discovery.sourceCommit !== source.sourceCommit || discovery.dirty || source.dirty) throw new Error('Confirmation requires a clean, completed, failure-free discovery using the same source commit and frozen profiles.');
  checkIndependentSeeds(seeds, discovery.seeds);
}
