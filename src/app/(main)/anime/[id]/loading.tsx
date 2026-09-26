export default function AnimeDetailLoading() {
    return (
        <section className="detail-section">
            <div className="detail-container">
                <div className="detail-breadcrumb">
                    <span className="detail-skeleton" style={{ width: 200, height: 14 }} />
                </div>

                <div className="detail-header">
                    <div className="detail-poster">
                        <div className="detail-skeleton" style={{ width: 260, height: 390, borderRadius: 14 }} />
                    </div>
                    <div className="detail-header-info" style={{ flex: 1 }}>
                        <div className="detail-skeleton" style={{ width: "65%", height: 32, marginBottom: 16 }} />
                        <div className="detail-skeleton" style={{ width: "45%", height: 20, marginBottom: 16 }} />
                        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                            {[70, 90, 80].map((w, i) => (
                                <span key={i} className="detail-skeleton" style={{ width: w, height: 28, borderRadius: 9999 }} />
                            ))}
                        </div>
                        <div className="detail-skeleton" style={{ width: "40%", height: 14, marginBottom: 10 }} />
                        <div className="detail-skeleton" style={{ width: "35%", height: 14 }} />
                    </div>
                </div>

                <div className="detail-block">
                    <div className="detail-skeleton" style={{ width: 100, height: 22, marginBottom: 16 }} />
                    <div className="detail-skeleton" style={{ width: "100%", height: 14, marginBottom: 8 }} />
                    <div className="detail-skeleton" style={{ width: "92%", height: 14, marginBottom: 8 }} />
                    <div className="detail-skeleton" style={{ width: "78%", height: 14 }} />
                </div>
            </div>
        </section>
    );
}
