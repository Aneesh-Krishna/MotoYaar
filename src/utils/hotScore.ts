// TODO: Full implementation in Story 6.x — Community Hot Score
export function hotScore(likes: number, dislikes: number, _createdAt: Date): number {
  return likes - dislikes;
}
