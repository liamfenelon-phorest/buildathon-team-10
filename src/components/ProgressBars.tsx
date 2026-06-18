interface Props {
  count: number;
  current: number;
  /** Fill fraction (0–1) of the current segment. */
  progress: number;
}

export function ProgressBars({ count, current, progress }: Props) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={current + 1} aria-valuemax={count}>
      {Array.from({ length: count }).map((_, i) => {
        const fill = i < current ? 1 : i === current ? progress : 0;
        return (
          <span className="progress__seg" key={i}>
            <span
              className="progress__fill"
              style={{ transform: `scaleX(${fill})` }}
            />
          </span>
        );
      })}
    </div>
  );
}
