import type { MetadataRoute } from "next";


export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Grounded Gems",
        short_name: "GG",
        description: "Grounded Gems - Your go-to platform for discovering and sharing unique gems and experiences.",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#000000",
    }
}