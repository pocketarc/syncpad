import { useEffect, useState } from "react";

export function useHostname() {
    const [hostname, setHostname] = useState("");

    useEffect(() => {
        setHostname(window.location.hostname);
    }, []);

    return hostname;
}
