import SearchPage from "@/components/SearchPage";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Search | Grounded Gems",
  description: "Search for events, users, and more on Grounded Gems.",
};

export default function Search() {
  return (
    <div>
      <SearchPage />
    </div>
  );
}