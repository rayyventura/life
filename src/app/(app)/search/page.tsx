import Search from "@/components/Search"

export default function SearchPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Search</h1>
        <p className="page-subtitle">Find anything across your second brain.</p>
      </div>
      <Search />
    </div>
  )
}
