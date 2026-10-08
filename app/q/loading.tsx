// Shown the instant you tap — the real page streams in behind it.
export default function Loading() {
  return (
    <main className="q-main" aria-busy="true">
      <div>
        <div className="q-skel" style={{ width: 90, height: 11 }} />
        <div className="q-skel" style={{ width: 140, height: 28, marginTop: 8 }} />
      </div>
      {[5, 3, 4].map((rows, i) => (
        <section key={i} className="q-panel">
          <div className="q-panel-title"><span className="q-skel" style={{ width: 80, height: 10 }} /></div>
          {Array.from({ length: rows }, (_, j) => (
            <div key={j} className="q-row">
              <span className="q-skel" style={{ width: 26, height: 26 }} />
              <span className="q-skel" style={{ flex: 1, height: 14 }} />
            </div>
          ))}
        </section>
      ))}
    </main>
  )
}
