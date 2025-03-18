import { HoverCardContent } from "@/components/ui/hover-card";

interface EntryInfoProps {
  entryNumber: string;
  tokenMetadata: string;
}

const EntryInfo = ({ entryNumber, tokenMetadata }: EntryInfoProps) => {
  return (
    <HoverCardContent
      className="w-80 py-4 px-0 text-sm z-50"
      align="start"
      side="top"
      sideOffset={5}
      alignOffset={-80}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 px-4">
          <h4 className="font-medium">Entry #{entryNumber}</h4>
          <p className="text-muted-foreground">Game Settings</p>
        </div>
        <div className="w-full h-0.5 bg-brand/50" />
        {tokenMetadata !== "" ? (
          <img
            src={JSON.parse(tokenMetadata)?.image}
            alt="metadata"
            className="w-full h-auto px-4"
          />
        ) : (
          <span className="text-center text-neutral">No Token URI</span>
        )}
      </div>
    </HoverCardContent>
  );
};

export default EntryInfo;
