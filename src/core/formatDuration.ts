const pad = (value: number): string => String(value).padStart(2, '0');

export const formatDuration = (milliseconds: number): string => {
  const totalSeconds = Number.isFinite(milliseconds)
    ? Math.max(0, Math.floor(milliseconds / 1000))
    : 0;

  return `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}`;
};
