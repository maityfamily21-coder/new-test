export default function Footer() {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-background/80 backdrop-blur-sm border rounded-lg px-3 py-2 shadow-lg">
        <p className="text-xs text-muted-foreground">
          Curated & Coded<span className="text-red-500">🧶</span>:{" "}
          <a
            href="https://simonmaity.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            SimonMaity
          </a>
        </p>
      </div>
    </div>
  )
}
