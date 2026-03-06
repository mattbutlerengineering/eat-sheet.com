/**
 * Returns a SQL CTE that resolves all member_ids visible to a given user.
 * Visible peers = anyone sharing at least one group with the user, plus the user themselves.
 *
 * Usage: prepend to any query, then use `WHERE column IN (SELECT member_id FROM visible_peers)`
 * Bind the member_id parameter TWICE (once for gm1.member_id, once for the UNION self-include).
 */
export function visiblePeersCte(): string {
  return `WITH visible_peers AS (
  SELECT DISTINCT gm2.member_id
  FROM group_members gm1
  JOIN group_members gm2 ON gm2.group_id = gm1.group_id
  WHERE gm1.member_id = ?
  UNION
  SELECT ?
)`;
}

/**
 * Returns the number of bind parameters the CTE requires.
 * Always 2: the member_id for the JOIN, and the member_id for the self-include UNION.
 */
export const VISIBLE_PEERS_BIND_COUNT = 2;
