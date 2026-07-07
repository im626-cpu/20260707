export default function ProgressBar({ current, target }: { current: number; target: number }) {
  const ratio = target > 0 ? Math.min(current / target, 1) : 0;

  return (
    <div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full bg-neutral-900"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
