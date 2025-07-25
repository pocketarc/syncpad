import type { FilePayload } from "@syncpad/shared/src/types.ts";

export function downloadFile(payload: FilePayload) {
    try {
        const splitBase64 = payload.data.split(",");

        if (typeof splitBase64[1] !== "string") {
            console.error("Invalid base64 data format:", payload.data);
            return;
        }

        const byteCharacters = atob(splitBase64[1]);
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
