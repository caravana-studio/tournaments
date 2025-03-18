import { Skeleton } from "@/components/ui/skeleton";

const RowSkeleton = () => {
  return <Skeleton className="h-5 w-full" />;
};

interface TableSkeletonProps {
  entryCount: number;
  offset: number;
}

const TableSkeleton = ({ entryCount, offset }: TableSkeletonProps) => {
  return (
    <div className="flex flex-row gap-10">
      {[0, 1].map((colIndex) => (
        <div key={colIndex} className="flex flex-col gap-1.5 py-2 w-1/2">
          {Array.from({
            length: Math.max(
              0,
              Math.min(
                5,
                Math.floor((entryCount - offset) / 2) +
                  (colIndex === 0 ? (entryCount - offset) % 2 : 0)
              )
            ),
          }).map((_, index) => (
            <RowSkeleton key={index} />
          ))}
        </div>
      ))}
    </div>
  );
};

export default TableSkeleton;
