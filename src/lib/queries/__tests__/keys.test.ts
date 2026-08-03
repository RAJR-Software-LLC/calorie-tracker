import { queryKeys } from '@/lib/queries/keys';

describe('family query keys', () => {
  it('scopes family and shared-items by uid and familyId', () => {
    expect(queryKeys.family('u1', 'fam-1')).toEqual(['family', 'u1', 'fam-1']);
    expect(queryKeys.familySharedItems('u1', 'fam-1')).toEqual([
      'familySharedItems',
      'u1',
      'fam-1',
    ]);
    expect(queryKeys.exerciseRange('u1', '2026-01-01', '2026-01-07')).toEqual([
      'exercise',
      'u1',
      'range',
      '2026-01-01',
      '2026-01-07',
    ]);
  });
});
