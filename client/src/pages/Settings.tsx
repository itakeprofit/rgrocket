import ApiSettings from "@/components/settings/ApiSettings";
import AppSettings from "@/components/settings/AppSettings";
import AccountSettings from "@/components/settings/AccountSettings";

export default function Settings() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-medium">Settings</h1>
      </div>

      <div className="space-y-8">
        {/* Telegram API Settings */}
        <ApiSettings />

        {/* Application Settings */}
        <AppSettings />

        {/* Account Settings */}
        <AccountSettings />
      </div>
    </div>
  );
}
