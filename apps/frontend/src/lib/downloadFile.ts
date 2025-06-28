import type { FileMessagePayload } from "@/lib/types";

export function downloadFile(payload: FileMessagePayload) {
    try {
        const byteCharacters = atob(payload.data.split(",")[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: payload.type });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = payload.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    } catch (error) {
        console.error("Failed to process incoming file:", error);
    }
}
