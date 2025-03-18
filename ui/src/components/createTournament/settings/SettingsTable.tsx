import { Settings } from "@/generated/models.gen";
import { feltToString } from "@/lib/utils";

interface SettingsTableProps {
  hasSettings: boolean;
  settings: Settings[];
}

const SettingsTable = ({ hasSettings, settings }: SettingsTableProps) => {
  // If game doesn't exist in config or has no settings
  if (!hasSettings) {
    return (
      <div className="border border-brand-muted rounded-lg overflow-hidden w-3/4 p-4">
        <div className="flex flex-col items-center justify-center text-center gap-2 text-muted-foreground">
          <div className="text-sm">No settings available for this game yet</div>
          <div className="text-xs">Default configuration will be used</div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-brand-muted rounded-lg overflow-hidden w-3/4">
      <table className="w-full">
        <tbody className="divide-y divide-brand-muted">
          {settings.map((setting, index) => (
            <tr key={index} className="hover:bg-brand/5 transition-colors">
              {/* <td className="p-2 pl-4">
                <img
                  src={`/icons/${game}/${item.icon}`}
                  alt={item.label}
                  className="w-6 h-6 text-brand"
                />
              </td> */}
              <td className="p-2 text-sm font-medium">
                {feltToString(setting.name)}
              </td>
              <td className="p-2 pr-4 text-sm text-muted-foreground text-right">
                {setting.value.toString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SettingsTable;
