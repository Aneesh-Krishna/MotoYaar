export function hotScore(likes: number, dislikes: number, createdAt: Date): number {
  const net = likes - dislikes;
  if (net === 0) return 0;
  const ageHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  const decay = Math.exp(-ageHours / 24);
  return net * decay;
}
