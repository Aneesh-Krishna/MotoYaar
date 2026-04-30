const PARTICIPANT_COLORS = [
  "#F97316", // orange (brand — host)
  "#3B82F6", // blue
  "#10B981", // green
  "#8B5CF6", // purple
  "#EF4444", // red
  "#F59E0B", // amber
  "#06B6D4", // cyan
  "#EC4899", // pink
];

export function getParticipantColor(index: number): string {
  return PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length];
}
