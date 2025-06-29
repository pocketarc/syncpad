interface StatusBarProps {
    status: string;
}

export function StatusBar({ status }: StatusBarProps) {
    const getStatusColor = () => {
        switch (status) {
            case "Connected":
                return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700";
            case "Connecting":
                return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700";
            case "Disconnected":
                return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700";
            default:
                return "text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-600";
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case "Connected":
                return "●";
            case "Connecting":
                return "○";
            case "Disconnected":
                return "●";
            default:
                return "○";
        }
    };

    return (
        <div
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium mb-4 transition-colors duration-200 ${getStatusColor()}`}
            data-testid="status-bar"
        >
            <span className="text-xs">{getStatusIcon()}</span>
            {status === "Connected" && "Live sync active"}
            {status === "Connecting" && "Connecting..."}
            {status === "Disconnected" && "Offline - changes won't sync"}
            {!["Connected", "Connecting", "Disconnected"].includes(status) && `Status: ${status}`}
        </div>
    );
}
