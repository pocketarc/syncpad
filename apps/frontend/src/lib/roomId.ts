// Word lists for generating memorable room IDs
const adjectives = [
    "brave",
    "calm",
    "clever",
    "eager",
    "gentle",
    "happy",
    "kind",
    "lively",
    "noble",
    "quick",
    "silent",
    "swift",
    "tender",
    "vivid",
    "warm",
    "bright",
    "cool",
    "deep",
    "free",
    "grand",
    "light",
    "magic",
    "ocean",
    "proud",
    "royal",
    "smart",
    "sweet",
    "urban",
    "wild",
    "zen",
];

const nouns = [
    "apple",
    "bridge",
    "castle",
    "dragon",
    "eagle",
    "forest",
    "garden",
    "harbor",
    "island",
    "jungle",
    "knight",
    "lighthouse",
    "mountain",
    "ocean",
    "palace",
    "river",
    "sunset",
    "temple",
    "valley",
    "wave",
    "anchor",
    "beacon",
    "crown",
    "diamond",
    "ember",
    "flame",
    "galaxy",
    "horizon",
    "jewel",
    "keystone",
];

const colors = [
    "amber",
    "azure",
    "coral",
    "crimson",
    "emerald",
    "golden",
    "indigo",
    "jade",
    "lavender",
    "mint",
    "navy",
    "olive",
    "pearl",
    "rose",
    "silver",
    "turquoise",
    "violet",
    "yellow",
    "bronze",
    "copper",
];

const animals = [
    "bear",
    "deer",
    "eagle",
    "fox",
    "lion",
    "owl",
    "wolf",
    "hawk",
    "seal",
    "whale",
    "tiger",
    "panda",
    "robin",
    "swan",
    "falcon",
    "raven",
    "otter",
    "lynx",
    "crane",
    "dove",
];

/**
 * Generates a random memorable room ID in the format: word-word-word-word
 * Example: "brave-coral-eagle-castle"
 */
export function generateRoomId(): string {
    const getRandomItem = <T>(array: T[]): T => {
        if (array.length === 0) {
            throw new Error("Array cannot be empty");
        }

        const randomRoom = array[Math.floor(Math.random() * array.length)];

        if (!randomRoom) {
            throw new Error(
                "This should never happen - the key should always be present in the array. This is here to ensure type safety.",
            );
        }

        return randomRoom;
    };

    return [getRandomItem(adjectives), getRandomItem(colors), getRandomItem(animals), getRandomItem(nouns)].join("-");
}
