interface StatusBarProps {
    status: string;
}

export function StatusBar({ status }: StatusBarProps) {
    return (
        <p className="text-sm text-gray-500 mb-4" data-testid="status-bar">
            Status: {status}
        </p>
    );
}
