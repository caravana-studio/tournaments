import { Settings } from "@/generated/models.gen";
import { feltToString } from "@/lib/utils";

interface SmallSettingsTableProps {
  hasSettings: boolean;
  settings: Settings[];
}

const SmallSettingsTable = ({
  hasSettings,
  settings,
}: SmallSettingsTableProps) => {
  if (!hasSettings) {
    return (
      <div className="border border-brand-muted rounded-lg p-4">
        <div className="flex flex-col items-center justify-center text-center gap-2 text-muted-foreground">
          <div className="text-sm">No settings available for this game yet</div>
          <div className="text-xs">Default configuration will be used</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-row gap-2 overflow-x-auto">
      {settings.map((item, index) => (
        <div
          key={index}
          className="border border-brand-muted rounded-lg p-3 bg-background hover:bg-brand/10 transition-colors flex-shrink-0"
        >
          <div className="flex items-center gap-3">
            {/* <img
              src={`/icons/${game}/${item.icon}`}
              alt={item.label}
              className="w-5 h-5 text-brand"
            /> */}
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {feltToString(item.name)}
              </span>
              <span className="text-xs text-muted-foreground">
                {item.value.toString()}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SmallSettingsTable;
