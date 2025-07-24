/**
 * Validates room ID format (4 words separated by hyphens)
 */
export function isValidRoomId(roomId: string): boolean {
    if (!roomId) {
        return false;
    }

    const parts = roomId.split("-");
    return parts.length === 4 && parts.every((part) => part.length > 0);
}
