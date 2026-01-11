interface StatusBarProps {
    status: string;
    error?: string | null;
    isEncrypted?: boolean;
}

export function StatusBar({ status, error, isEncrypted }: StatusBarProps) {
    const getStatusColor = () => {
        if (error) {
            return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700";
        }
        switch (status) {
            case "Connected":
                if (isEncrypted === false) {
                    return "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700";
                }
                return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700";
            case "Connecting":
            case "Reconnecting":
                return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700";
            case "Disconnected":
                return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700";
            default:
                return "text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-600";
        }
    };

    const getStatusIcon = () => {
        if (error) {
            return "⚠️";
        }
        switch (status) {
            case "Connected":
                if (isEncrypted === false) {
                    return "⚠️";
                }
                if (isEncrypted === true) {
                    return "🔒";
                }
                return "●";
            case "Connecting":
            case "Reconnecting":
                return "○";
            case "Disconnected":
                return "●";
            default:
                return "○";
        }
    };

    const getStatusText = () => {
        if (error) {
            return error;
        }
        switch (status) {
            case "Connected":
                if (isEncrypted === false) {
                    return "Live sync active - UNENCRYPTED";
                }
                if (isEncrypted === true) {
                    return "Live sync active (encrypted)";
                }
                return "Live sync active";
            case "Connecting":
                return "Connecting...";
            case "Reconnecting":
                return "Reconnecting...";
            case "Disconnected":
                return "Offline - changes won't sync";
            default:
                return `Status: ${status}`;
        }
    };

    return (
        <div
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium mb-4 transition-colors duration-200 ${getStatusColor()}`}
            data-testid="status-bar"
        >
            <span className="text-xs">{getStatusIcon()}</span> {getStatusText()}
        </div>
    );
}
