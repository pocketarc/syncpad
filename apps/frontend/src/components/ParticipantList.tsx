"use client";

import type { Participant } from "@syncpad/shared/src/types";

interface ParticipantListProps {
    participants: Participant[];
    connectionStatus: string;
    className?: string;
}

function getBrowserIcon(userAgent: string): string {
    const ua = userAgent.toLowerCase();

    if (ua.includes("firefox")) {
        return "🦊";
    }
    if (ua.includes("chrome") && !ua.includes("edg")) {
        return "🌐";
    }
    if (ua.includes("safari") && !ua.includes("chrome")) {
        return "🧭";
    }
    if (ua.includes("edg")) {
        return "🟢";
    }
    if (ua.includes("opera")) {
        return "🎭";
    }
    return "🖥️";
}

function getCountryFlag(countryCode: string | null): string {
    if (!countryCode) {
        return "🌍";
    }

    // Convert ISO country code to flag emoji
    const codePoints = countryCode
        .toUpperCase()
        .split("")
        .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

function formatConnectionTime(connectedAt: string): string {
    const now = new Date();
    const connected = new Date(connectedAt);
    const diffMinutes = Math.floor((now.getTime() - connected.getTime()) / 60000);

    if (diffMinutes < 1) {
        return "just now";
    }
    if (diffMinutes === 1) {
        return "1 min ago";
    }
    if (diffMinutes < 60) {
        return `${diffMinutes} min ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours === 1) {
        return "1 hour ago";
    }
    return `${diffHours} hours ago`;
}

export function ParticipantList({ participants, connectionStatus, className = "" }: ParticipantListProps) {
    if (connectionStatus !== "Connected" || participants.length === 0) {
        return null;
    }

    return (
        <div
            className={`rounded-lg border border-stone-300/50 bg-white/80 px-3 py-2 backdrop-blur-sm transition-colors duration-200 dark:border-stone-600/50 dark:bg-stone-800/80 ${className}`}
            data-testid="participant-list"
        >
            <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-stone-700 dark:text-stone-300">
                    {participants.length === 1 ? "1 participant" : `${participants.length} participants`}
                </span>
                <div className="hidden sm:flex items-center gap-1">
                    {participants.slice(0, 5).map((participant) => (
                        <div
                            key={participant.id}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-stone-100 dark:bg-stone-700"
                            title={`Connected ${formatConnectionTime(participant.connectedAt)} • ${participant.userAgent}`}
                        >
                            <span>{getCountryFlag(participant.country)}</span>
                            <span>{getBrowserIcon(participant.userAgent)}</span>
                        </div>
                    ))}
                    {participants.length > 5 && (
                        <div className="text-xs text-stone-500 dark:text-stone-400 px-1">
                            +{participants.length - 5} more
                        </div>
                    )}
                </div>
                <div className="sm:hidden flex items-center gap-1">
                    {participants.slice(0, 3).map((participant) => (
                        <span key={participant.id} className="text-base">
                            {getCountryFlag(participant.country)}
                        </span>
                    ))}
                    {participants.length > 3 && (
                        <span className="text-xs text-stone-500 dark:text-stone-400">+{participants.length - 3}</span>
                    )}
                </div>
            </div>
        </div>
    );
}
